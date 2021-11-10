import { promises as fs } from "fs";
import path from "path";
import { runCli } from "../utils/run-cli";
import { prepareCliTest, runSyncTest } from "../utils/run-cli-test";

describe("coat sync - skipInstall", () => {
  const testPackagesPath = path.join(__dirname, "..", "utils", "test-packages");
  const localDependency1Path = path.join(
    testPackagesPath,
    "local-dependency-1"
  );
  const syncTestOptions = {
    coatManifest: {
      name: "project",
      dependencies: {
        dependencies: {
          "local-dependency-1": localDependency1Path,
        },
      },
    },
  };
  const lockFileName = "package-lock.json";

  test("should install dependencies by default", async () => {
    const { cwd, task } = await runSyncTest(syncTestOptions);

    await task;
    await fs.stat(path.join(cwd, lockFileName));
  });

  test("should skip installing dependencies if skipInstall flag is passed", async () => {
    const cwd = await prepareCliTest(syncTestOptions);
    const { task } = runCli(["sync", "--skipInstall"], { cwd });

    await task;
    await expect(() => fs.stat(path.join(cwd, lockFileName))).rejects.toThrow();
  });
});
