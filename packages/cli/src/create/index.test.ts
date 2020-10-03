import { promises as fs } from "fs";
import path from "path";
import { vol } from "memfs";
import execa from "execa";
import chalk from "chalk";
import { create } from ".";
import { getProjectName } from "./get-project-name";
import { getTemplateInfo } from "./get-template-info";
import { sync } from "../sync";
import { COAT_CLI_VERSION, COAT_MANIFEST_FILENAME } from "../constants";
import { addInitialCommit } from "./add-initial-commit";

jest
  .mock("fs")
  .mock("execa")
  .mock("ora")
  .mock("./get-template-info")
  .mock("./get-project-name")
  .mock("./add-initial-commit")
  .mock("./print-create-messages")
  .mock("../sync");

const execaMock = (execa as unknown) as jest.Mock;
const execaMockImplementation = (): unknown => ({
  exitCode: 0,
  stdout: "",
});
execaMock.mockImplementation(execaMockImplementation);

(getProjectName as jest.Mock).mockImplementation(() => "prompted-name");

(getTemplateInfo as jest.Mock).mockImplementation(() => ({
  name: "my-template",
}));

const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {
  // Ignore console log messages
});

describe("create", () => {
  afterEach(() => {
    vol.reset();
    jest.clearAllMocks();
  });

  test("should be exported correctly", () => {
    expect(create).toBeInstanceOf(Function);
  });

  test("should prompt for a project name if no target dir is specified", async () => {
    await create("my-template");

    const dir = await fs.readdir(".");
    expect(dir).toEqual(["prompted-name"]);
  });

  test("should prompt for the project name if target dir is a relative path", async () => {
    await create("my-template", ".");

    const dir = await fs.readdir(".");
    dir.sort();
    expect(dir).toEqual(["coat.json", "package.json"]);

    const coatManifest = await fs.readFile(COAT_MANIFEST_FILENAME, "utf-8");
    expect(JSON.parse(coatManifest)).toHaveProperty("name", "prompted-name");
  });

  test("should re-throw error if npm install fails", async () => {
    execaMock.mockImplementationOnce(() => {
      throw new Error("Install error");
    });

    await expect(() => create("my-template")).rejects.toHaveProperty(
      "message",
      "Install error"
    );
  });

  test("should create package.json and coat.json files in the specified target dir", async () => {
    await create("my-template", "targetDir", "project-name");

    const dir = await fs.readdir("targetDir");
    dir.sort();
    expect(dir).toEqual(["coat.json", "package.json"]);

    const [coatManifestRaw, packageJsonRaw] = await Promise.all([
      fs.readFile(path.join("targetDir", "coat.json"), "utf8"),
      fs.readFile(path.join("targetDir", "package.json"), "utf8"),
    ]);
    const coatManifest = JSON.parse(coatManifestRaw);
    const packageJson = JSON.parse(packageJsonRaw);
    expect(coatManifest).toEqual({
      name: "project-name",
      extends: "my-template",
    });
    expect(packageJson).toEqual({
      name: "project-name",
      version: "1.0.0",
    });
  });

  test("should use the target directory as the project name if no project name is specified", async () => {
    await create("template", "project-name");
    const [dirs, coatManifest] = await Promise.all([
      fs.readdir("."),
      fs.readFile(path.join("project-name", COAT_MANIFEST_FILENAME), "utf-8"),
    ]);

    expect(dirs).toEqual(["project-name"]);
    expect(JSON.parse(coatManifest)).toHaveProperty("name", "project-name");
  });

  test("should work with absolute target dir paths", async () => {
    const targetDir = path.join(process.cwd(), "target-dir");
    await create("template", targetDir, "project-name");
    const dirs = await fs.readdir(process.cwd());
    expect(dirs).toEqual(["target-dir"]);
  });

  test("should throw an error if there are already files in the target directory", async () => {
    expect.assertions(1);
    await fs.mkdir("targetDir", { recursive: true });
    await fs.writeFile(path.join("targetDir", "test-file"), "");

    try {
      await create("template", "targetDir", "project-name");
    } catch (error) {
      expect(error).toHaveProperty(
        "message",
        "Warning! The specified target diretory is not empty. Aborting to prevent accidental file loss or override."
      );
    }
  });

  test("should add the template as a devDependency in the target dir", async () => {
    await create("template", "project-name");

    expect(execa).toHaveBeenCalledTimes(3);
    expect(execa).toHaveBeenCalledWith(
      "npm",
      ["install", "--save-exact", "--save-dev", "template"],
      {
        cwd: path.join(process.cwd(), "project-name"),
      }
    );
  });

  test("should initialize a git repository in the target dir", async () => {
    await create("template", "project-name");

    expect(addInitialCommit).toHaveBeenCalledTimes(1);
    expect(addInitialCommit).toHaveBeenCalledWith(
      path.join(process.cwd(), "project-name")
    );
  });

  test("should add the template and its peerDependencies as devDependencies in the target dir", async () => {
    (getTemplateInfo as jest.Mock).mockImplementationOnce(() => ({
      name: "template",
      peerDependencies: {
        "peer-a": "^0.0.1",
        "peer-b": "*",
      },
    }));
    await create("template", "project-name");

    expect(execa).toHaveBeenCalledTimes(4);
    expect(execa).toHaveBeenCalledWith(
      "npm",
      ["install", "--save-exact", "--save-dev", "template"],
      {
        cwd: path.join(process.cwd(), "project-name"),
      }
    );
    expect(execa).toHaveBeenCalledWith(
      "npm",
      ["install", "--save-dev", "peer-a@^0.0.1", "peer-b@*"],
      {
        cwd: path.join(process.cwd(), "project-name"),
      }
    );
  });

  describe("sync functions", () => {
    afterEach(() => {
      execaMock.mockImplementation(execaMockImplementation);
    });

    test("should log message if locally installed @coat/cli version differs from the currently running cli", async () => {
      execaMock.mockImplementation((cmd, args) => {
        if (
          cmd === "npx" &&
          args.includes("coat") &&
          args.includes("--version")
        ) {
          return {
            exitCode: 0,
            stdout: "1.0.0-mocked.1",
          };
        }
      });
      consoleLogSpy.mockClear();

      await create("template", "project-name");

      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Running %s with @coat/cli version %s\n",
        chalk.cyan("coat sync"),
        "1.0.0-mocked.1"
      );
    });

    test("should not log message if locally installed @coat/cli version is the same as the currently running cli", async () => {
      execaMock.mockImplementation((cmd, args) => {
        if (
          cmd === "npx" &&
          args.includes("coat") &&
          args.includes("--version")
        ) {
          return {
            exitCode: 0,
            stdout: COAT_CLI_VERSION,
          };
        }
      });
      consoleLogSpy.mockClear();

      await create("template", "project-name");

      const hasLogMessage = consoleLogSpy.mock.calls.some((consoleLine) =>
        consoleLine
          .toString()
          .startsWith("Running coat setup and coat sync with @coat/cli version")
      );
      expect(hasLogMessage).toBe(false);
    });

    test("should call the coat sync function from the local @coat/cli package", async () => {
      execaMock.mockClear();
      // Use an absolute path as the target dir to make the assertion below
      // environment agnostic
      const targetDir = "/opt/coat-cli/test/target-dir";
      await create("template", targetDir, "project-name");
      expect(execaMock).toHaveBeenCalledWith(
        "npx",
        ["--no-install", "coat", "sync"],
        {
          cwd: targetDir,
          stdio: "inherit",
        }
      );
    });

    test("should call the coat sync function directly if the local @coat/cli package doesn't exist", async () => {
      (sync as jest.Mock).mockClear();
      execaMock.mockImplementation((cmd, innerArgs) => {
        if (
          cmd === "npx" &&
          innerArgs.includes("coat") &&
          innerArgs.includes("--version")
        ) {
          return {
            exitCode: 1,
          };
        }
        return {
          exitCode: 0,
          stdout: 0,
        };
      });

      await create(
        "template",
        "/absolute/test/path/project-name",
        "project-name"
      );
      expect(sync).toHaveBeenCalledTimes(1);
      expect(sync).toHaveBeenCalledWith("/absolute/test/path/project-name");
    });
  });
});
