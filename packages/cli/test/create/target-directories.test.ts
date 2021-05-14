import fs from "fs-extra";
import path from "path";
import { runCli } from "../utils/run-cli";
import { getTmpDir } from "../utils/get-tmp-dir";
import { enterPrompts, KeyboardInput } from "../utils/enter-prompts";
import {
  COAT_MANIFEST_FILENAME,
  PACKAGE_JSON_FILENAME,
} from "../../src/constants";
import execa from "execa";

describe("coat create - target directories", () => {
  const defaultTemplate = path.join(
    __dirname,
    "..",
    "utils",
    "test-packages",
    "local-create-template-1"
  );
  const defaultTargetDir = "project-name";
  const defaultProjectName = "project-name";
  const packageJsonFileName = "package.json";
  const coatManifestFileName = "coat.json";
  const defaultEntries = [
    ".git",
    ".gitignore",
    "a.json",
    coatManifestFileName,
    "coat.lock",
    "ignored.txt",
    packageJsonFileName,
    "package-lock.json",
    "node_modules",
  ];
  defaultEntries.sort();

  const defaultPackageJsonResult = {
    name: defaultProjectName,
    version: "1.0.0",
  };
  const defaultCoatManifestResult = {
    name: defaultProjectName,
    extends: "local-create-template-1",
  };

  test("should use the project name as the directory when project name is prompted", async () => {
    const targetDir = defaultTargetDir;
    const { task, cwd } = runCli(["create", defaultTemplate]);
    enterPrompts(task.stdin, [defaultProjectName, KeyboardInput.Enter]);

    await task;
    const [entries, packageJson, coatManifest] = await Promise.all([
      fs.readdir(path.join(cwd, targetDir)),
      fs.readFile(path.join(cwd, targetDir, packageJsonFileName), "utf8"),
      fs.readFile(path.join(cwd, targetDir, coatManifestFileName), "utf8"),
    ]);
    entries.sort();

    expect(entries).toEqual(defaultEntries);
    expect(JSON.parse(packageJson)).toEqual(
      expect.objectContaining({ name: defaultProjectName, version: "1.0.0" })
    );
    expect(JSON.parse(coatManifest)).toEqual(defaultCoatManifestResult);
  });

  test("should use the directory as the project name when directory is specified", async () => {
    const { task, cwd } = runCli(["create", defaultTemplate, defaultTargetDir]);
    await task;
    const [entries, packageJson, coatManifest] = await Promise.all([
      fs.readdir(path.join(cwd, defaultTargetDir)),
      fs.readFile(
        path.join(cwd, defaultTargetDir, packageJsonFileName),
        "utf8"
      ),
      fs.readFile(
        path.join(cwd, defaultTargetDir, coatManifestFileName),
        "utf8"
      ),
    ]);
    entries.sort();

    expect(entries).toEqual(defaultEntries);
    expect(JSON.parse(packageJson)).toEqual(
      expect.objectContaining(defaultPackageJsonResult)
    );
    expect(JSON.parse(coatManifest)).toEqual(defaultCoatManifestResult);
  });

  test("should apply the specified projectName", async () => {
    const targetDir = "project-target-dir";
    const { task, cwd } = runCli([
      "create",
      defaultTemplate,
      targetDir,
      defaultProjectName,
    ]);
    await task;
    const [entries, packageJson, coatManifest] = await Promise.all([
      fs.readdir(path.join(cwd, targetDir)),
      fs.readFile(path.join(cwd, targetDir, packageJsonFileName), "utf8"),
      fs.readFile(path.join(cwd, targetDir, coatManifestFileName), "utf8"),
    ]);
    entries.sort();

    expect(entries).toEqual(defaultEntries);
    expect(JSON.parse(packageJson)).toEqual(
      expect.objectContaining(defaultPackageJsonResult)
    );
    expect(JSON.parse(coatManifest)).toEqual(defaultCoatManifestResult);
  });

  test("should work with nested target dir paths", async () => {
    const targetDir = path.join("first-dir", "second-dir");
    const { task, cwd } = runCli([
      "create",
      defaultTemplate,
      targetDir,
      defaultProjectName,
    ]);
    await task;
    const [firstLevelFolder, entries, packageJson, coatManifest] =
      await Promise.all([
        fs.readdir(path.join(cwd, "first-dir")),
        fs.readdir(path.join(cwd, targetDir)),
        fs.readFile(path.join(cwd, targetDir, packageJsonFileName), "utf8"),
        fs.readFile(path.join(cwd, targetDir, coatManifestFileName), "utf8"),
      ]);
    entries.sort();

    expect(firstLevelFolder).toEqual(["second-dir"]);
    expect(entries).toEqual(defaultEntries);
    expect(JSON.parse(packageJson)).toEqual(
      expect.objectContaining(defaultPackageJsonResult)
    );
    expect(JSON.parse(coatManifest)).toEqual(defaultCoatManifestResult);
  });

  test("should work with absolute paths", async () => {
    const targetDir = getTmpDir();
    const { task } = runCli([
      "create",
      defaultTemplate,
      targetDir,
      defaultProjectName,
    ]);
    await task;
    const [entries, packageJson, coatManifest] = await Promise.all([
      fs.readdir(targetDir),
      fs.readFile(path.join(targetDir, packageJsonFileName), "utf8"),
      fs.readFile(path.join(targetDir, coatManifestFileName), "utf8"),
    ]);
    entries.sort();

    expect(entries).toEqual(defaultEntries);
    expect(JSON.parse(packageJson)).toEqual(
      expect.objectContaining(defaultPackageJsonResult)
    );
    expect(JSON.parse(coatManifest)).toEqual(defaultCoatManifestResult);
  });

  test("should work with relative paths that are outside of the root directory", async () => {
    const tmpDir = getTmpDir();
    // Create a few folders which will be used as the cwd
    const cwd = path.join(tmpDir, "a", "b", "c");
    await fs.mkdirp(cwd);

    const relativeTargetDir = path.join("..", "..", "b-2", "c-2");
    const targetDir = path.join(cwd, relativeTargetDir);
    const { task } = runCli(
      ["create", defaultTemplate, relativeTargetDir, defaultProjectName],
      { cwd }
    );
    await task;
    const [entries, packageJson, coatManifest] = await Promise.all([
      fs.readdir(targetDir),
      fs.readFile(path.join(targetDir, packageJsonFileName), "utf8"),
      fs.readFile(path.join(targetDir, coatManifestFileName), "utf8"),
    ]);
    entries.sort();

    expect(entries).toEqual(defaultEntries);
    expect(JSON.parse(packageJson)).toEqual(
      expect.objectContaining(defaultPackageJsonResult)
    );
    expect(JSON.parse(coatManifest)).toEqual(defaultCoatManifestResult);
  });

  test("should work with with the current directory as the target if it doesn't contain a coat manifest", async () => {
    const tmpDir = getTmpDir();

    const targetDir = ".";

    // Create one file that will be managed by coat, another file which is unrelated
    await Promise.all([
      fs.outputFile(
        path.join(tmpDir, "a.json"),
        JSON.stringify({ a: "before-create" })
      ),
      fs.outputFile(path.join(tmpDir, "unrelated-file.json"), "{}"),
    ]);

    const { task } = runCli(
      ["create", defaultTemplate, targetDir, defaultProjectName],
      { cwd: tmpDir }
    );

    // User will be prompted since a.json needs to be overwritten
    enterPrompts(task.stdin, ["yes", KeyboardInput.Enter]);

    await task;

    const [entries, packageJson, coatManifest] = await Promise.all([
      fs.readdir(tmpDir),
      fs.readFile(path.join(tmpDir, packageJsonFileName), "utf8"),
      fs.readFile(path.join(tmpDir, coatManifestFileName), "utf8"),
    ]);
    entries.sort();

    expect(entries).toEqual([...defaultEntries, "unrelated-file.json"]);
    expect(JSON.parse(packageJson)).toEqual(
      expect.objectContaining(defaultPackageJsonResult)
    );
    expect(JSON.parse(coatManifest)).toEqual(defaultCoatManifestResult);
  });

  test("should work with with the current directory as the target and keep the existing package.json file", async () => {
    const tmpDir = getTmpDir();

    const targetDir = ".";

    // Create a package.json file in the target dir
    await fs.outputFile(
      path.join(tmpDir, PACKAGE_JSON_FILENAME),
      JSON.stringify({
        name: "name-before-create",
        version: "10.1.2",
      })
    );

    const { task } = runCli(
      ["create", defaultTemplate, targetDir, defaultProjectName],
      { cwd: tmpDir }
    );
    await task;
    const [entries, packageJson, coatManifest] = await Promise.all([
      fs.readdir(tmpDir),
      fs.readFile(path.join(tmpDir, packageJsonFileName), "utf8"),
      fs.readFile(path.join(tmpDir, coatManifestFileName), "utf8"),
    ]);
    entries.sort();

    expect(entries).toEqual(defaultEntries);
    expect(JSON.parse(packageJson)).toEqual(
      expect.objectContaining({
        name: "name-before-create",
        version: "10.1.2",
      })
    );
    expect(JSON.parse(coatManifest)).toEqual(defaultCoatManifestResult);
  });

  test("should work with with the current directory if the project is created twice in a row (removing coat.json)", async () => {
    const tmpDir = getTmpDir();
    const targetDir = ".";

    // Create project for the first time
    const { task: firstCreateRun } = runCli(
      ["create", defaultTemplate, targetDir, defaultProjectName],
      { cwd: tmpDir }
    );
    await firstCreateRun;

    // Remove coat.json and create project again
    await fs.unlink(path.join(tmpDir, COAT_MANIFEST_FILENAME));
    const { task: secondCreateRun } = runCli(
      ["create", defaultTemplate, targetDir, defaultProjectName],
      { cwd: tmpDir }
    );
    await secondCreateRun;

    const [entries, packageJson, coatManifest] = await Promise.all([
      fs.readdir(tmpDir),
      fs.readFile(path.join(tmpDir, packageJsonFileName), "utf8"),
      fs.readFile(path.join(tmpDir, coatManifestFileName), "utf8"),
    ]);
    entries.sort();

    expect(entries).toEqual(defaultEntries);
    expect(JSON.parse(packageJson)).toEqual(
      expect.objectContaining(defaultPackageJsonResult)
    );
    expect(JSON.parse(coatManifest)).toEqual(defaultCoatManifestResult);

    // Ensure that there are no pending changes in git
    await expect(
      execa("git", ["diff", "--exit-code"], { cwd: tmpDir })
    ).resolves.toHaveProperty("exitCode", 0);
  });
});
