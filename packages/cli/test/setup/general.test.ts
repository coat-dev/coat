import { promises as fs } from "fs";
import path from "path";
import {
  COAT_GLOBAL_LOCKFILE_PATH,
  COAT_LOCAL_LOCKFILE_PATH,
} from "../../src/constants";
import { runCli } from "../utils/run-cli";
import { runSetupTest } from "../utils/run-cli-test";

describe("setup - general", () => {
  const testPackagesPath = path.join(__dirname, "..", "utils", "test-packages");

  test("should output help text correctly", async () => {
    const { task: helpArgumentPromise } = runCli(["setup", "--help"]);
    const { task: helpCommandPromise } = runCli(["help", "setup"]);

    const [helpArgument, helpCommand] = await Promise.all([
      helpArgumentPromise,
      helpCommandPromise,
    ]);

    expect(helpArgument.stdout).toEqual(helpCommand.stdout);
    expect(helpArgument.stdout).toMatchInlineSnapshot(`
      "Usage: coat setup [options]

      Runs all setup tasks of the current coat project

      Options:
        -h, --help  
        
        Gathers all setup tasks of the extended templates and runs them in sequential order."
    `);
  });

  test("should run all tasks in a fresh coat project", async () => {
    const { cwd, task } = await runSetupTest({
      coatManifest: {
        name: "test",
        extends: [path.join(testPackagesPath, "local-template-sync-setup-1")],
      },
    });
    await task;

    // Validate setup file has been placed
    const setupFile = await fs.readFile(
      path.join(cwd, "setup-test.txt"),
      "utf-8"
    );
    expect(setupFile).toBe("");
  });

  test("should run all tasks in a coat project where tasks were run before", async () => {
    const { cwd, task: firstSetupRun } = await runSetupTest({
      coatManifest: {
        name: "test",
        extends: [path.join(testPackagesPath, "local-template-sync-setup-1")],
      },
    });
    await firstSetupRun;

    // Validate setup file has been placed
    const setupFilePath = path.join(cwd, "setup-test.txt");
    let setupFile = await fs.readFile(setupFilePath, "utf-8");
    expect(setupFile).toBe("");

    // Remove setup file to validate that it will be placed again
    await fs.unlink(setupFilePath);

    // Run setup again
    const { task: secondSetupRun } = runCli(["setup"], { cwd });
    await secondSetupRun;

    // Validate setup file has been placed again
    setupFile = await fs.readFile(setupFilePath, "utf-8");
    expect(setupFile).toBe("");
  });

  test("should store task results in lockfiles", async () => {
    // Call setup 5 times, since taskResult will be
    // incremented from the tasks in the template
    //
    // First setup run
    const { cwd, task: firstSetupRun } = await runSetupTest({
      coatManifest: {
        name: "test",
        extends: [path.join(testPackagesPath, "local-template-setup-1")],
      },
    });
    await firstSetupRun;

    // 4 additional setup runs
    for (let i = 0; i < 4; i++) {
      const { task } = runCli(["setup"], { cwd });
      await task;
    }

    // Read lockfiles to ensure they contain the expected task results
    const [globalLockfile, localLockfile] = await Promise.all([
      fs.readFile(path.join(cwd, COAT_GLOBAL_LOCKFILE_PATH), "utf-8"),
      fs.readFile(path.join(cwd, COAT_LOCAL_LOCKFILE_PATH), "utf-8"),
    ]);

    expect(globalLockfile).toMatchInlineSnapshot(`
      "setup:
        globalTask:
          globalCounter: 5
      version: 1
      "
    `);

    expect(localLockfile).toMatchInlineSnapshot(`
      "setup:
        localTask:
          localCounter: 5
      version: 1
      "
    `);
  });

  test("should store results in lockfile although a later task throws an error", async () => {
    const { cwd, task } = await runSetupTest({
      coatManifest: {
        name: "test",
        extends: [path.join(testPackagesPath, "local-template-setup-2")],
      },
    });
    await expect(task).rejects.toHaveProperty(
      "message",
      expect.stringMatching(/Error: Expected Error/g)
    );

    // Validate that task results have been saved
    // before the second local task threw an error
    const [globalLockfile, localLockfile] = await Promise.all([
      fs.readFile(path.join(cwd, COAT_GLOBAL_LOCKFILE_PATH), "utf-8"),
      fs.readFile(path.join(cwd, COAT_LOCAL_LOCKFILE_PATH), "utf-8"),
    ]);

    expect(globalLockfile).toMatchInlineSnapshot(`
      "setup:
        globalTask1:
          firstResult: true
        globalTask2:
          secondResult: true
      version: 1
      "
    `);

    expect(localLockfile).toMatchInlineSnapshot(`
      "setup:
        localTask1:
          localFirstResult: true
      version: 1
      "
    `);
  });
});
