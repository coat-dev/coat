import { promises as fs } from "fs";
import path from "path";
import { vol } from "memfs";
import execa from "execa";
import { create } from ".";
import { getProjectName } from "./get-project-name";
import { getTemplateInfo } from "./get-template-info";
import { sync } from "../sync";
import { COAT_CLI_VERSION } from "../constants";

jest
  .mock("fs")
  .mock("execa")
  .mock("ora")
  .mock("../sync")
  .mock("./get-template-info")
  .mock("./get-project-name");

const execaMock = (execa as unknown) as jest.Mock;
const execaMockImplementation = (): unknown => ({
  exitCode: 0,
  stdout: "",
});
execaMock.mockImplementation(execaMockImplementation);

(getProjectName as jest.Mock).mockImplementation((name) => name);

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

  test("should create package.json and coat.json files in the specified target dir", async () => {
    await create("my-template", "project-name", "targetDir");

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

  test("should use the project-name as target directory if no dir specified", async () => {
    await create("template", "project-name");
    const dirs = await fs.readdir(".");
    expect(dirs).toEqual(["project-name"]);
  });

  test("should use the package name as the target dir for specified project names which are scoped packages", async () => {
    await create("template", "@coat/cli");
    const dirs = await fs.readdir(".");
    expect(dirs).toEqual(["cli"]);
  });

  test("should use the package name as the target dir for prompted project names which are scoped packages", async () => {
    (getProjectName as jest.Mock).mockImplementationOnce(() => "@coat/cli");
    await create("template");
    const dirs = await fs.readdir(".");
    expect(dirs).toEqual(["cli"]);
  });

  test("should work with absolute target dir paths", async () => {
    const targetDir = path.join(process.cwd(), "target-dir");
    await create("template", "project-name", targetDir);
    const dirs = await fs.readdir(process.cwd());
    expect(dirs).toEqual(["target-dir"]);
  });

  test("should throw an error if there are already files in the target directory", async () => {
    expect.assertions(1);
    await fs.mkdir("targetDir", { recursive: true });
    await fs.writeFile(path.join("targetDir", "test-file"), "");

    try {
      await create("template", "project-name", "targetDir");
    } catch (error) {
      expect(error).toHaveProperty(
        "message",
        "Warning! The specified target diretory is not empty. Aborting to prevent accidental file loss or override."
      );
    }
  });

  test("should add the template as a devDependency in the target dir", async () => {
    await create("template", "project-name");

    expect(execa).toHaveBeenCalledTimes(4);
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

    expect(execa).toHaveBeenCalledTimes(4);
    expect(execa).toHaveBeenCalledWith("git", ["init"], {
      cwd: path.join(process.cwd(), "project-name"),
    });
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

    expect(execa).toHaveBeenCalledTimes(5);
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

  test("should remove the target directory when installing the template fails and target directory is not specified directly by the user", async () => {
    expect.assertions(2);

    try {
      execaMock.mockImplementationOnce(() => {
        // Empty
      });
      execaMock.mockImplementationOnce(() =>
        Promise.reject(new Error("Rejected"))
      );
      await create("template", "project-name");
    } catch (error) {
      expect(error.message).toBe("Rejected");
      const dir = await fs.readdir(process.cwd());
      expect(dir).toEqual([]);
    }
  });

  test("should clean out the target directory if installing the template fails and the target directory has been specified directly by the user", async () => {
    expect.assertions(3);

    try {
      execaMock.mockImplementationOnce(() => {
        // Empty
      });
      execaMock.mockImplementationOnce(() =>
        Promise.reject(new Error("Rejected"))
      );
      await create("template", "project-name", "target-dir");
    } catch (error) {
      expect(error.message).toBe("Rejected");
      const [dir, targetDir] = await Promise.all([
        fs.readdir(process.cwd()),
        fs.readdir("target-dir"),
      ]);
      expect(dir).toEqual(["target-dir"]);
      expect(targetDir).toEqual([]);
    }
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
        "Running coat setup and coat sync with @coat/cli version %s",
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
      await create("template", "project-name", targetDir);
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
        "project-name",
        "/absolute/test/path/project-name"
      );
      expect(sync).toHaveBeenCalledTimes(1);
      expect(sync).toHaveBeenCalledWith("/absolute/test/path/project-name");
    });
  });
});
