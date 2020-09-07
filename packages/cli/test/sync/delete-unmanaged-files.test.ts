import fs from "fs-extra";
import path from "path";
import { testExceptWindows } from "../utils/test-except-windows";
import { prepareSyncTest, runSyncTest } from "../utils/run-sync-test";
import { runCli } from "../utils/run-cli";

describe("coat sync - delete unmanaged files", () => {
  test("should delete files that are no longer generated by coat", async () => {
    const unmanagedFilePath = "file.json";

    const cwd = await prepareSyncTest({
      coatLockfile: {
        version: 1,
        files: [
          {
            path: `folder-1/${unmanagedFilePath}`,
          },
        ],
      },
    });

    // Place unmanaged file
    await fs.outputFile(path.join(cwd, "folder-1", unmanagedFilePath), "");

    const { task } = runCli(["sync"], cwd);
    await task;

    await expect(
      fs.readFile(path.join(cwd, "folder-1", unmanagedFilePath))
    ).rejects.toHaveProperty(
      "message",
      expect.stringMatching(
        /ENOENT: no such file or directory, open '.*file.json'$/
      )
    );
  });

  test("should not throw any error if unmanaged files don't exist anymore", async () => {
    const unmanagedFilePath = "file.json";

    const { task } = await runSyncTest({
      coatLockfile: {
        version: 1,
        files: [
          {
            path: unmanagedFilePath,
          },
        ],
      },
    });
    await task;
  });

  testExceptWindows(
    "should throw errors if unmanaged files cannot be accessed",
    async () => {
      const unmanagedFileName = "file.json";

      const cwd = await prepareSyncTest({
        coatLockfile: {
          version: 1,
          files: [
            {
              path: `folder-1/${unmanagedFileName}`,
            },
          ],
        },
      });

      // Place unmanaged file
      await fs.outputFile(path.join(cwd, "folder-1", unmanagedFileName), "");
      // Deny access to unmanaged file
      await fs.chmod(path.join(cwd, "folder-1"), 0o000);

      try {
        const { task } = runCli(["sync"], cwd);
        await expect(task).rejects.toHaveProperty(
          "message",
          expect.stringMatching(
            /.*EACCES: permission denied, unlink '.*file.json'.*/g
          )
        );
      } finally {
        await fs.chmod(path.join(cwd, "folder-1"), 0o777);
      }
    }
  );
});