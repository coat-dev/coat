import fs from "fs-extra";
import path from "path";
import stripAnsi from "strip-ansi";
import yaml from "js-yaml";
import {
  COAT_GLOBAL_LOCKFILE_PATH,
  COAT_GLOBAL_LOCKFILE_VERSION,
  COAT_LOCAL_LOCKFILE_PATH,
  COAT_LOCAL_LOCKFILE_VERSION,
} from "../../src/constants";
import {
  CoatGlobalLockfile,
  CoatLocalLockfile,
} from "../../src/types/coat-lockfiles";
import { runCli } from "../utils/run-cli";
import { prepareCliTest, runSyncTest } from "../utils/run-cli-test";
import { CoatManifestFileType } from "../../src";

export default {};

describe("coat sync - --check option", () => {
  const testPackagesPath = path.join(__dirname, "..", "utils", "test-packages");

  test("should exit successfully if coat project is up to date", async () => {
    // Run sync once to create project and bring it in sync
    const { task: firstSyncTask, cwd } = await runSyncTest();
    await firstSyncTask;

    // Run sync --check
    const { task: checkTask } = runCli(["sync", "--check"], { cwd });
    const result = await checkTask;

    expect(result).toHaveProperty("exitCode", 0);
    expect(stripAnsi(result.stdout)).toMatchInlineSnapshot(`
          "
          ♻️ Everything up to date
          "
      `);
  });

  test("should exit successfully even if there are local tasks that need to be run", async () => {
    // Run sync once to create project and bring it in sync
    const { task: firstSyncTask, cwd } = await runSyncTest({
      coatManifest: {
        name: "test",
        extends: [path.join(testPackagesPath, "local-template-setup-3")],
      },
    });
    await firstSyncTask;

    // Remove the file the local task created to test a sync run with the --check flag
    const testFilePath = path.join(cwd, "localTask1.txt");
    await fs.unlink(testFilePath);

    // Run sync --check
    const { task: checkTask } = runCli(["sync", "--check"], { cwd });
    const result = await checkTask;

    expect(result).toHaveProperty("exitCode", 0);
    expect(stripAnsi(result.stdout)).toMatchInlineSnapshot(`
          "
          ♻️ Everything up to date
          "
        `);

    // Ensure that file from local task does not exist -> Task has not run
    await expect(fs.readFile(testFilePath)).rejects.toHaveProperty(
      "message",
      expect.stringContaining("ENOENT: no such file or directory")
    );
  });

  test("should exit successfully even if there are local lockfile updates pending", async () => {
    // Both setup & sync should have local lockfile updates here
    // Run sync once to create project and bring it in sync
    const { task: firstSyncTask, cwd } = await runSyncTest();
    await firstSyncTask;

    // Place a local lockfile that needs to be updated since
    // a local task result and a local file entry are outdated
    // and would be removed
    const localLockfile: CoatLocalLockfile = {
      version: COAT_LOCAL_LOCKFILE_VERSION,
      files: [
        {
          hash: "",
          path: "a.json",
        },
      ],
      setup: {
        localTask: {
          localTaskResult: 1,
        },
      },
    };
    await fs.outputFile(
      path.join(cwd, COAT_LOCAL_LOCKFILE_PATH),
      yaml.dump(localLockfile)
    );

    // Run sync --check
    const { task: checkTask } = runCli(["sync", "--check"], { cwd });
    const result = await checkTask;

    expect(result).toHaveProperty("exitCode", 0);
    expect(stripAnsi(result.stdout)).toMatchInlineSnapshot(`
          "
          ♻️ Everything up to date
          "
        `);

    const localLockfileOnDisk = await fs.readFile(
      path.join(cwd, COAT_LOCAL_LOCKFILE_PATH),
      "utf-8"
    );
    expect(yaml.load(localLockfileOnDisk)).toEqual(localLockfile);
  });

  test("should exit with error and log that there are pending global tasks", async () => {
    // Run sync once to create project and bring it in sync
    const { task: firstSyncTask, cwd } = await runSyncTest({
      coatManifest: {
        name: "test",
        extends: [path.join(testPackagesPath, "local-template-setup-4")],
      },
    });
    await firstSyncTask;

    // Remove the file the global task created to test a sync run with the --check flag
    const testFilePath = path.join(cwd, "globalTask1.txt");
    await fs.unlink(testFilePath);

    // Run sync --check
    const { task: checkTask } = runCli(["sync", "--check"], { cwd });
    try {
      await checkTask;
      throw new Error("checkTask should fail");
    } catch (error) {
      expect(error.exitCode).toBe(1);
      expect(stripAnsi(error.stderr)).toMatchInlineSnapshot(`
        "
        The coat project is not in sync.
        There are global tasks pending that need to be run to setup this coat project.

        Run coat sync to bring the project back in sync."
      `);
    }

    // Ensure that file from global task does not exist -> Task has not run
    await expect(fs.readFile(testFilePath)).rejects.toHaveProperty(
      "message",
      expect.stringContaining("ENOENT: no such file or directory")
    );
  });

  test("should exit with error if global lockfile has pending setup updates", async () => {
    // Run sync once to create project and bring it in sync
    const { task: firstSyncTask, cwd } = await runSyncTest();
    await firstSyncTask;

    // Place a global lockfile that needs to be updated since
    // a global task result is outdated and would be removed
    const globalLockfile: CoatGlobalLockfile = {
      version: COAT_GLOBAL_LOCKFILE_VERSION,
      setup: {
        globalTask: {
          globalTaskResult: 1,
        },
      },
    };
    await fs.outputFile(
      path.join(cwd, COAT_GLOBAL_LOCKFILE_PATH),
      yaml.dump(globalLockfile)
    );

    // Run sync --check
    const { task: checkTask } = runCli(["sync", "--check"], { cwd });
    try {
      await checkTask;
      throw new Error("checkTask should fail");
    } catch (error) {
      expect(error.exitCode).toBe(1);
      expect(stripAnsi(error.stderr)).toMatchInlineSnapshot(`
        "
        The coat project is not in sync.
        The global lockfile (coat.lock) needs to be updated.

        Run coat sync to bring the project back in sync."
      `);
    }

    const globalLockfileOnDisk = await fs.readFile(
      path.join(cwd, COAT_GLOBAL_LOCKFILE_PATH),
      "utf-8"
    );
    expect(yaml.load(globalLockfileOnDisk)).toEqual(globalLockfile);
  });

  test("should exit with error if global lockfile has pending sync updates", async () => {
    // Run sync once to create project and bring it in sync
    const { task: firstSyncTask, cwd } = await runSyncTest();
    await firstSyncTask;

    // Place a global lockfile that needs to be updated since
    // a global file is outdated and would be removed
    const globalLockfile: CoatGlobalLockfile = {
      version: COAT_GLOBAL_LOCKFILE_VERSION,
      files: [
        {
          hash: "test-hash",
          path: "file-a.json",
        },
      ],
    };
    await fs.outputFile(
      path.join(cwd, COAT_GLOBAL_LOCKFILE_PATH),
      yaml.dump(globalLockfile)
    );

    // Run sync --check
    const { task: checkTask } = runCli(["sync", "--check"], { cwd });
    try {
      await checkTask;
      throw new Error("checkTask should fail");
    } catch (error) {
      expect(error.exitCode).toBe(1);
      expect(stripAnsi(error.stderr)).toMatchInlineSnapshot(`
        "
        The coat project is not in sync.
        The global lockfile (coat.lock) needs to be updated.

        Run coat sync to bring the project back in sync."
      `);
    }

    const globalLockfileOnDisk = await fs.readFile(
      path.join(cwd, COAT_GLOBAL_LOCKFILE_PATH),
      "utf-8"
    );
    expect(yaml.load(globalLockfileOnDisk)).toEqual(globalLockfile);
  });

  test("should exit successfully even if there are local file operations pending", async () => {
    // Run sync once to create project and bring it in sync
    const testFileName = "a.json";
    const { task: firstSyncTask, cwd } = await runSyncTest({
      coatManifest: {
        name: "test",
        files: [
          {
            local: true,
            file: "a.json",
            content: {},
            type: CoatManifestFileType.Json,
          },
        ],
      },
    });
    await firstSyncTask;

    const testFilePath = path.join(cwd, testFileName);
    await fs.unlink(testFilePath);

    // Run sync --check
    const { task: checkTask } = runCli(["sync", "--check"], { cwd });
    const result = await checkTask;

    expect(result).toHaveProperty("exitCode", 0);
    expect(stripAnsi(result.stdout)).toMatchInlineSnapshot(`
      "
      ♻️ Everything up to date
      "
    `);

    await expect(fs.readFile(testFilePath)).rejects.toHaveProperty(
      "message",
      expect.stringContaining("ENOENT: no such file or directory")
    );
  });

  test("should exit with error and log pending global file operations", async () => {
    // Prepare sync test
    const cwd = await prepareCliTest({
      coatManifest: {
        name: "project",
        extends: [
          "local-files-1",
          "local-files-2",
          "local-files-3",
        ].map((templateName) => path.join(testPackagesPath, templateName)),
      },
    });

    try {
      const { task: checkTask } = runCli(["sync", "--check"], { cwd });
      await checkTask;
      throw new Error("checkTask should fail");
    } catch (error) {
      expect(error.exitCode).toBe(1);
      expect(stripAnsi(error.stderr)).toMatchInlineSnapshot(`
        "
        The coat project is not in sync.
        There are pending file updates:

          CREATE  .gitignore
          CREATE  a.json
          CREATE  b.txt
          CREATE  c.txt
          UPDATE  package.json

        Run coat sync to bring the project back in sync."
      `);
    }
  });
});
