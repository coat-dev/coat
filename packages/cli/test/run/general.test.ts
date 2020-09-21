import { promises as fs } from "fs";
import path from "path";
import { PACKAGE_JSON_FILENAME } from "../../src/constants";
import { getTmpDir } from "../utils/get-tmp-dir";
import { runCli } from "../utils/run-cli";
import { runSyncTest } from "../utils/run-cli-test";

describe("coat run - general", () => {
  test("should run a single package.json script in a coat project", async () => {
    const { cwd, task: syncTask } = await runSyncTest({
      coatManifest: {
        name: "test",
        scripts: [
          {
            id: "test-script",
            scriptName: "test-script",
            run: "echo Running test script",
          },
        ],
      },
    });
    await syncTask;

    const { task: runTask } = runCli(["run", "test-script"], { cwd });
    const result = await runTask;

    expect(result.stdout).toContain("Running test script");
  });

  test("should run multiple package.json scripts in a coat project", async () => {
    const { cwd, task: syncTask } = await runSyncTest({
      coatManifest: {
        name: "test",
        scripts: [
          {
            id: "test-script-1",
            scriptName: "test-script",
            run: "echo Running test script 1",
          },
          {
            id: "test-script-2",
            scriptName: "test-script",
            run: "echo Running test script 2",
          },
          {
            id: "test-script-3",
            scriptName: "another-test-script",
            run: "echo Running another test script",
          },
        ],
      },
    });
    await syncTask;

    const { task: runTask } = runCli(
      ["run", "test-script:*", "another-test-script"],
      { cwd }
    );
    const result = await runTask;

    expect(result.stdout).toContain("Running test script 1");
    expect(result.stdout).toContain("Running test script 2");
    expect(result.stdout).toContain("Running another test script");
  });

  test("should run multiple package.json scripts in a non-coat project", async () => {
    const cwd = getTmpDir();
    // Place package.json file in test directory
    const packageJson = {
      scripts: {
        "test-script:1": "echo Running test script 1",
        "test-script:2": "echo Running test script 2",
        "another-test-script": "echo Running another test script",
      },
    };
    await fs.writeFile(
      path.join(cwd, PACKAGE_JSON_FILENAME),
      JSON.stringify(packageJson)
    );

    const { task: runTask } = runCli(
      ["run", "test-script:*", "another-test-script"],
      { cwd }
    );
    const result = await runTask;

    expect(result.stdout).toContain("Running test script 1");
    expect(result.stdout).toContain("Running test script 2");
    expect(result.stdout).toContain("Running another test script");
  });

  test("should exit with the exitCode from the script if it fails", async () => {
    const { cwd, task: syncTask } = await runSyncTest({
      coatManifest: {
        name: "test",
        scripts: [
          {
            id: "test-script",
            scriptName: "test-script",
            run: 'node -e "process.exit(5);"',
          },
        ],
      },
    });
    await syncTask;

    const { task: runTask } = runCli(["run", "test-script"], { cwd });
    try {
      await runTask;
      throw new Error("should not be reached");
    } catch (error) {
      expect(error.exitCode).toBe(5);
    }
  });

  test("should fail fast if one of the scripts fails and the other is a long running script", async () => {
    const { cwd, task: syncTask } = await runSyncTest({
      coatManifest: {
        name: "test",
        scripts: [
          {
            id: "test-script",
            scriptName: "test-script",
            run: 'node -e "process.exit(5);"',
          },
          {
            id: "test-script-2",
            scriptName: "test-script",
            run: "node -e \"setTimeout(() => console.log('Done'), 15000);\"",
          },
        ],
      },
    });
    await syncTask;

    const { task: runTask } = runCli(["run", "test-script:*"], { cwd });
    try {
      await runTask;
      throw new Error("should not be reached");
    } catch (error) {
      expect(error.stdout).not.toContain("Done");
      expect(error.exitCode).toBe(5);
    }
  });
});
