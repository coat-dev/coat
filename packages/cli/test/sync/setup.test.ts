import { promises as fs } from "fs";
import path from "path";
import { runCli } from "../utils/run-cli";
import { runSyncTest } from "../utils/run-cli-test";

describe("sync - setup", () => {
  const testPackagesPath = path.join(__dirname, "..", "utils", "test-packages");

  test("should call setup and run tasks if necessary", async () => {
    const { cwd, task } = await runSyncTest({
      coatManifest: {
        name: "test",
        extends: [path.join(testPackagesPath, "local-template-sync-setup-1")],
      },
    });
    await task;

    const setupTestFile = await fs.readFile(
      path.join(cwd, "setup-test.txt"),
      "utf-8"
    );
    expect(setupTestFile).toBe("");
  });

  test("should call setup but not run tasks if already ran previously", async () => {
    const { cwd, task: firstSyncRun } = await runSyncTest({
      coatManifest: {
        name: "test",
        extends: [path.join(testPackagesPath, "local-template-sync-setup-1")],
      },
    });
    await firstSyncRun;

    const setupTestFile = await fs.readFile(
      path.join(cwd, "setup-test.txt"),
      "utf-8"
    );
    expect(setupTestFile).toBe("");

    // Remove file to check whether setup task is run again
    await fs.unlink(path.join(cwd, "setup-test.txt"));

    // Run sync again
    const { task: secondSyncRun } = runCli(["sync"], { cwd });
    await secondSyncRun;

    // Validate that setup file does not exist
    await expect(
      fs.readFile(path.join(cwd, "setup-test.txt"), "utf-8")
    ).rejects.toHaveProperty(
      "message",
      expect.stringMatching(
        /ENOENT: no such file or directory, open '.*setup-test.txt/
      )
    );
  });

  test("should call setup and run tasks where the shouldRun function returns true, even though they ran previously", async () => {
    const { cwd, task: firstSyncRun } = await runSyncTest({
      coatManifest: {
        name: "test",
        extends: [path.join(testPackagesPath, "local-template-sync-setup-2")],
      },
    });
    await firstSyncRun;

    let setupTestFile = await fs.readFile(
      path.join(cwd, "setup-test.txt"),
      "utf-8"
    );
    expect(setupTestFile).toBe("");

    // Remove file to check whether setup task is run again
    await fs.unlink(path.join(cwd, "setup-test.txt"));

    // Run sync again
    const { task: secondSyncRun } = runCli(["sync"], { cwd });
    await secondSyncRun;

    // Validate that setup file has been written again
    setupTestFile = await fs.readFile(
      path.join(cwd, "setup-test.txt"),
      "utf-8"
    );
    expect(setupTestFile).toBe("");
  });
});
