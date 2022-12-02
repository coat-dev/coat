import execa from "execa";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import which from "which";
import { getTmpDir } from "../utils/get-tmp-dir";
import { runCli } from "../utils/run-cli";

describe("create/git", () => {
  const testProjectName = "project-name";
  const testPackagesPath = path.join(__dirname, "..", "utils", "test-packages");
  const localFilesTemplate = path.join(
    testPackagesPath,
    "local-create-template-1"
  );
  const defaultFiles = [
    ".gitignore",
    "a.json",
    "coat.json",
    "coat.lock",
    "ignored.txt",
    "node_modules",
    "package-lock.json",
    "package.json",
  ];
  defaultFiles.sort();

  test("should create a git repository and an initial commit with all generated files", async () => {
    const { cwd, task } = runCli([
      "create",
      localFilesTemplate,
      testProjectName,
    ]);
    await task;

    const projectCwd = path.join(cwd, testProjectName);

    // Ensure project dir has a .git folder
    const stats = await fs.stat(path.join(projectCwd, ".git"));
    expect(stats.isDirectory()).toBe(true);

    // Ensure project dir has no active changes,
    // since all files should have been added to a commit
    const modifiedFiles = await execa("git", ["status", "--porcelain"], {
      cwd: projectCwd,
    });
    expect(modifiedFiles.stdout).toBe("");

    // Verify single commit and commit message
    const gitLog = await execa("git", ["log", "--pretty=oneline"], {
      cwd: projectCwd,
    });
    expect(gitLog.stdout).toEqual(
      expect.stringMatching(/.* Initialize project using coat create/)
    );
  });

  test("should not create a git repository if project directory is already within a git repository", async () => {
    const tmpDir = getTmpDir();
    // Initialize a git repository in tmpDir
    await execa("git", ["init"], { cwd: tmpDir });

    const { cwd, task } = runCli(
      ["create", localFilesTemplate, testProjectName],
      { cwd: tmpDir }
    );
    await task;

    const projectCwd = path.join(cwd, testProjectName);

    // Ensure project dir does not have a .git folder
    const projectEntries = await fs.readdir(projectCwd);
    projectEntries.sort();
    expect(projectEntries).toEqual(defaultFiles);
  });

  test("should not create a git repository if git command is unavailable", async () => {
    // Get path to node and npm
    const [nodePath, npmPath] = await Promise.all([
      which("node"),
      which("npm"),
    ]);

    let pathTmp: string;
    if (os.platform() === "win32") {
      // Windows will receive the direct path to Node.js and npm,
      // since npm.cmd relies on relative files in its directory
      pathTmp = `${path.dirname(nodePath)};${path.dirname(npmPath)}`;
    } else {
      // Create a folder where node and npm are symlinked
      pathTmp = getTmpDir();

      await Promise.all([
        fs.symlink(nodePath, path.join(pathTmp, path.basename(nodePath))),
        fs.symlink(npmPath, path.join(pathTmp, path.basename(npmPath))),
      ]);
    }

    const { cwd, task } = runCli(
      ["create", localFilesTemplate, testProjectName],
      {
        env: {
          // Only use a path that makes node and npm
          // available
          PATH: pathTmp,
          // Windows
          Path: pathTmp,
        },
      }
    );
    await task;

    const projectCwd = path.join(cwd, testProjectName);

    // Ensure project dir does not have a .git folder
    const projectEntries = await fs.readdir(projectCwd);
    projectEntries.sort();
    expect(projectEntries).toEqual(defaultFiles);
  });
});
