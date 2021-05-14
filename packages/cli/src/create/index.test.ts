import fs from "fs-extra";
import path from "path";
import { vol } from "memfs";
import execa from "execa";
import { create } from ".";
import { getProjectName } from "./get-project-name";
import { getTemplateInfo } from "./get-template-info";
import { COAT_MANIFEST_FILENAME, PACKAGE_JSON_FILENAME } from "../constants";
import { addInitialCommit } from "./add-initial-commit";

jest
  .mock("fs")
  .mock("execa")
  .mock("ora")
  .mock("./get-template-info")
  .mock("./get-project-name")
  .mock("./add-initial-commit")
  .mock("./print-create-customization-help")
  .mock("../bin/get-coat-header");

const execaMock = execa as unknown as jest.Mock;
const execaMockImplementation = (): unknown => ({
  exitCode: 0,
  stdout: "",
});
execaMock.mockImplementation(execaMockImplementation);

(getProjectName as jest.Mock).mockImplementation(() => "prompted-name");

(getTemplateInfo as jest.Mock).mockImplementation(() => ({
  name: "my-template",
}));

jest.spyOn(console, "log").mockImplementation(() => {
  // Ignore console log messages
});

const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {
  // Ignore console error messages
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
    await create({ template: "my-template" });

    const dir = await fs.readdir(".");
    expect(dir).toEqual(["prompted-name"]);
  });

  test("should prompt for the project name if target dir is a relative path", async () => {
    await create({ template: "my-template", directory: "." });

    const dir = await fs.readdir(".");
    dir.sort();
    expect(dir).toEqual(["coat.json", "package.json"]);

    const coatManifest = await fs.readFile(COAT_MANIFEST_FILENAME, "utf-8");
    expect(JSON.parse(coatManifest)).toHaveProperty("name", "prompted-name");
  });

  test("should throw an error if existing coat.json cannot be accessed", async () => {
    await fs.outputFile(COAT_MANIFEST_FILENAME, "{}");
    await fs.chmod(COAT_MANIFEST_FILENAME, 0o000);

    await expect(
      create({ template: "my-template", directory: "." })
    ).rejects.toHaveProperty(
      "message",
      expect.stringMatching(/EACCES: permission denied, open '.*coat.json'/)
    );
  });

  test("should throw an error if existing package.json cannot be accessed", async () => {
    await fs.outputFile(PACKAGE_JSON_FILENAME, "{}");
    await fs.chmod(PACKAGE_JSON_FILENAME, 0o000);

    await expect(
      create({ template: "my-template", directory: "." })
    ).rejects.toHaveProperty(
      "message",
      expect.stringMatching(/EACCES: permission denied, open '.*package.json'/)
    );
  });

  test("should re-throw error if npm install fails", async () => {
    execaMock.mockImplementationOnce(() => {
      throw new Error("Install error");
    });

    await expect(() =>
      create({ template: "my-template" })
    ).rejects.toHaveProperty("message", "Install error");
  });

  test("should create package.json and coat.json files in the specified target dir", async () => {
    await create({
      template: "my-template",
      directory: "targetDir",
      projectName: "project-name",
    });

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

  test("should not create package.json if it already exists", async () => {
    await fs.outputFile(PACKAGE_JSON_FILENAME, "{}");

    await create({ template: "my-template", directory: "." });

    const packageJsonRaw = await fs.readFile(PACKAGE_JSON_FILENAME, "utf-8");
    const packageJson = JSON.parse(packageJsonRaw);

    expect(packageJson).toEqual({});
  });

  test("should use the target directory as the project name if no project name is specified", async () => {
    await create({ template: "template", directory: "project-name" });
    const [dirs, coatManifest] = await Promise.all([
      fs.readdir("."),
      fs.readFile(path.join("project-name", COAT_MANIFEST_FILENAME), "utf-8"),
    ]);

    expect(dirs).toEqual(["project-name"]);
    expect(JSON.parse(coatManifest)).toHaveProperty("name", "project-name");
  });

  test("should work with absolute target dir paths", async () => {
    const targetDir = path.join(process.cwd(), "target-dir");
    await create({
      template: "template",
      directory: targetDir,
      projectName: "project-name",
    });
    const dirs = await fs.readdir(process.cwd());
    expect(dirs).toEqual(["target-dir"]);
  });

  test("should throw an error if a coat manifest file already exists in the target directory", async () => {
    await fs.outputFile(path.join("targetDir", "coat.json"), "{}");

    await expect(
      create({
        template: "template",
        directory: "targetDir",
        projectName: "project-namme",
      })
    ).rejects.toHaveProperty("message", "coat manifest file already exists");

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenLastCalledWith(
      "A coat manifest file already exists in the target directory.\n\nPlease install the template manually via npm and add the name of the template to the existing coat manifest file."
    );
  });

  test("should add the template as a devDependency in the target dir", async () => {
    await create({ template: "template", directory: "project-name" });

    expect(execa).toHaveBeenCalledTimes(2);
    expect(execa).toHaveBeenCalledWith(
      "npm",
      ["install", "--save-exact", "--save-dev", "template"],
      {
        cwd: path.join(process.cwd(), "project-name"),
      }
    );
  });

  test("should initialize a git repository in the target dir", async () => {
    await create({ template: "template", directory: "project-name" });

    expect(addInitialCommit).toHaveBeenCalledTimes(1);
    expect(addInitialCommit).toHaveBeenCalledWith(
      path.join(process.cwd(), "project-name")
    );
  });

  test("should add the template as a devDependency in the target dir", async () => {
    (getTemplateInfo as jest.Mock).mockImplementationOnce(() => ({
      name: "template",
      peerDependencies: {
        "peer-a": "^0.0.1",
        "peer-b": "*",
      },
    }));
    await create({ template: "template", directory: "project-name" });

    expect(execa).toHaveBeenCalledTimes(2);
    expect(execa).toHaveBeenCalledWith(
      "npm",
      ["install", "--save-exact", "--save-dev", "template"],
      {
        cwd: path.join(process.cwd(), "project-name"),
      }
    );
  });

  test("should spawn coat again to run sync in the newly created project", async () => {
    await create({ template: "template", directory: "project-name" });

    expect(execa).toHaveBeenCalledTimes(2);
    expect(execa).toHaveBeenCalledWith(
      expect.stringContaining("node"),
      [expect.any(String), "sync"],
      {
        cwd: path.join(process.cwd(), "project-name"),
        stdio: "inherit",
      }
    );
  });
});
