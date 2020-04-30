import { promises as fs } from "fs";
import path from "path";
import { runCli } from "../utils/run-cli";
import { getTmpDir, cleanupTmpDirs } from "../utils/get-tmp-dir";
import { enterPrompts, KeyboardInput } from "../utils/enter-prompts";

jest.setTimeout(30000);

afterAll(() => {
  cleanupTmpDirs();
});

describe("coat create - target directories", () => {
  const defaultTemplate = "@coat/template-ts-package@0.0.1";
  const defaultProjectName = "project-name";
  const packageJsonFileName = "package.json";
  const coatManifestFileName = "coat.json";
  const defaultEntries = [
    coatManifestFileName,
    packageJsonFileName,
    "package-lock.json",
    "node_modules",
  ];
  defaultEntries.sort();
  function createPackageJsonResult(
    projectName: string,
    devDependencies: object
  ): object {
    return {
      name: projectName,
      version: "1.0.0",
      devDependencies,
    };
  }
  const defaultPackageJsonResult = createPackageJsonResult(defaultProjectName, {
    "@coat/cli": "0.0.1",
    "@coat/template-ts-package": "0.0.1",
  });
  const defaultCoatManifestResult = {
    name: defaultProjectName,
    extends: "@coat/template-ts-package",
  };

  test.concurrent(
    "should use the projectName as the directory when projectName is prompted",
    async () => {
      const targetDir = defaultProjectName;
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
      expect(JSON.parse(packageJson)).toEqual(defaultPackageJsonResult);
      expect(JSON.parse(coatManifest)).toEqual(defaultCoatManifestResult);
    }
  );

  test.concurrent(
    "should use the projectName as the directory when projectName is specified",
    async () => {
      const { task, cwd } = runCli([
        "create",
        defaultTemplate,
        defaultProjectName,
      ]);
      await task;
      const [entries, packageJson, coatManifest] = await Promise.all([
        fs.readdir(path.join(cwd, defaultProjectName)),
        fs.readFile(
          path.join(cwd, defaultProjectName, packageJsonFileName),
          "utf8"
        ),
        fs.readFile(
          path.join(cwd, defaultProjectName, coatManifestFileName),
          "utf8"
        ),
      ]);
      entries.sort();

      expect(entries).toEqual(defaultEntries);
      expect(JSON.parse(packageJson)).toEqual(defaultPackageJsonResult);
      expect(JSON.parse(coatManifest)).toEqual(defaultCoatManifestResult);
    }
  );

  test.concurrent(
    "should use the specified targetDir if projectName is valid",
    async () => {
      const targetDir = "project-target-dir";
      const { task, cwd } = runCli([
        "create",
        defaultTemplate,
        defaultProjectName,
        targetDir,
      ]);
      await task;
      const [entries, packageJson, coatManifest] = await Promise.all([
        fs.readdir(path.join(cwd, targetDir)),
        fs.readFile(path.join(cwd, targetDir, packageJsonFileName), "utf8"),
        fs.readFile(path.join(cwd, targetDir, coatManifestFileName), "utf8"),
      ]);
      entries.sort();

      expect(entries).toEqual(defaultEntries);
      expect(JSON.parse(packageJson)).toEqual(defaultPackageJsonResult);
      expect(JSON.parse(coatManifest)).toEqual(defaultCoatManifestResult);
    }
  );

  test.concurrent(
    "should use the specified targetDir if projectName is invalid and prompted again",
    async () => {
      const targetDir = "targetDir";
      const { task, cwd } = runCli([
        "create",
        defaultTemplate,
        "Invalid-project",
        targetDir,
      ]);
      enterPrompts(task.stdin, [defaultProjectName, KeyboardInput.Enter]);

      await task;
      const [entries, packageJson, coatManifest] = await Promise.all([
        fs.readdir(path.join(cwd, targetDir)),
        fs.readFile(path.join(cwd, targetDir, packageJsonFileName), "utf8"),
        fs.readFile(path.join(cwd, targetDir, coatManifestFileName), "utf8"),
      ]);
      entries.sort();

      expect(entries).toEqual(defaultEntries);
      expect(JSON.parse(packageJson)).toEqual(defaultPackageJsonResult);
      expect(JSON.parse(coatManifest)).toEqual(defaultCoatManifestResult);
    }
  );

  test.concurrent("should work with nested target dir paths", async () => {
    const targetDir = path.join("first-dir", "second-dir");
    const { task, cwd } = runCli([
      "create",
      defaultTemplate,
      defaultProjectName,
      targetDir,
    ]);
    await task;
    const [
      firstLevelFolder,
      entries,
      packageJson,
      coatManifest,
    ] = await Promise.all([
      fs.readdir(path.join(cwd, "first-dir")),
      fs.readdir(path.join(cwd, targetDir)),
      fs.readFile(path.join(cwd, targetDir, packageJsonFileName), "utf8"),
      fs.readFile(path.join(cwd, targetDir, coatManifestFileName), "utf8"),
    ]);
    entries.sort();

    expect(firstLevelFolder).toEqual(["second-dir"]);
    expect(entries).toEqual(defaultEntries);
    expect(JSON.parse(packageJson)).toEqual(defaultPackageJsonResult);
    expect(JSON.parse(coatManifest)).toEqual(defaultCoatManifestResult);
  });

  test.concurrent("should work with absolute paths", async () => {
    const targetDir = getTmpDir();
    const { task } = runCli([
      "create",
      defaultTemplate,
      defaultProjectName,
      targetDir,
    ]);
    await task;
    const [entries, packageJson, coatManifest] = await Promise.all([
      fs.readdir(targetDir),
      fs.readFile(path.join(targetDir, packageJsonFileName), "utf8"),
      fs.readFile(path.join(targetDir, coatManifestFileName), "utf8"),
    ]);
    entries.sort();

    expect(entries).toEqual(defaultEntries);
    expect(JSON.parse(packageJson)).toEqual(defaultPackageJsonResult);
    expect(JSON.parse(coatManifest)).toEqual(defaultCoatManifestResult);
  });

  test.concurrent(
    "should work with relative paths that are outside of the root directory",
    async () => {
      const tmpDir = getTmpDir();
      // Create a few folders which will be used as the cwd
      const cwd = path.join(tmpDir, "a", "b", "c");
      await fs.mkdir(cwd, { recursive: true });

      const relativeTargetDir = path.join("..", "..", "b-2", "c-2");
      const targetDir = path.join(cwd, relativeTargetDir);
      const { task } = runCli(
        ["create", defaultTemplate, defaultProjectName, relativeTargetDir],
        cwd
      );
      await task;
      const [entries, packageJson, coatManifest] = await Promise.all([
        fs.readdir(targetDir),
        fs.readFile(path.join(targetDir, packageJsonFileName), "utf8"),
        fs.readFile(path.join(targetDir, coatManifestFileName), "utf8"),
      ]);
      entries.sort();

      expect(entries).toEqual(defaultEntries);
      expect(JSON.parse(packageJson)).toEqual(defaultPackageJsonResult);
      expect(JSON.parse(coatManifest)).toEqual(defaultCoatManifestResult);
    }
  );

  test.concurrent(
    "should work with with the current directory as the target if it is empty",
    async () => {
      const tmpDir = getTmpDir();

      const targetDir = ".";
      const { task } = runCli(
        ["create", defaultTemplate, defaultProjectName, targetDir],
        tmpDir
      );
      await task;
      const [entries, packageJson, coatManifest] = await Promise.all([
        fs.readdir(tmpDir),
        fs.readFile(path.join(tmpDir, packageJsonFileName), "utf8"),
        fs.readFile(path.join(tmpDir, coatManifestFileName), "utf8"),
      ]);
      entries.sort();

      expect(entries).toEqual(defaultEntries);
      expect(JSON.parse(packageJson)).toEqual(defaultPackageJsonResult);
      expect(JSON.parse(coatManifest)).toEqual(defaultCoatManifestResult);
    }
  );
});
