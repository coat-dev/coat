import { ExecaError } from "execa";
import { runCli } from "../utils/run-cli";
import { runSyncTest } from "../utils/run-cli-test";

describe("run/unknown-commands", () => {
  test("should run a single script if command is not a known coat command", async () => {
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

    const { task: runTask } = runCli(["test-script"], { cwd });
    const result = await runTask;

    expect(result.stdout).toContain("Running test script");
  });

  test("should run a multiple scripts if command is not a known coat command", async () => {
    const { cwd, task: syncTask } = await runSyncTest({
      coatManifest: {
        name: "test",
        scripts: [
          {
            id: "test-script",
            scriptName: "test-script",
            run: "echo Running test script 1",
          },
          {
            id: "test-script-2",
            scriptName: "test-script",
            run: "echo Running test script 2",
          },
        ],
      },
    });
    await syncTask;

    const { task: runTask } = runCli(["test-script:*"], { cwd });
    const result = await runTask;

    expect(result.stdout).toContain("Running test script 1");
    expect(result.stdout).toContain("Running test script 2");
  });

  test("should forward the exit code if script fails", async () => {
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

    const { task: runTask } = runCli(["test-script"], { cwd });
    try {
      await runTask;
      throw new Error("Line should not be reached");
    } catch (error) {
      expect((error as ExecaError).exitCode).toBe(5);
    }
  });

  test("should fail fast if any of the scripts fails", async () => {
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

    const { task: runTask } = runCli(["test-script:*"], { cwd });
    try {
      await runTask;
      throw new Error("Line should not be reached");
    } catch (error) {
      expect((error as ExecaError).stdout).not.toContain("Done");
      expect((error as ExecaError).exitCode).toBe(5);
    }
  });

  test("should print unknown command error if error is thrown before any script is run", async () => {
    try {
      await runCli(["test-script"]).task;
    } catch (error) {
      expect((error as ExecaError).exitCode).toBe(1);
      expect((error as ExecaError).stderr).toMatchInlineSnapshot(
        `"error: unknown script or command 'test-script'. See 'coat --help'"`
      );
    }
  });
});
