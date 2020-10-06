import execa from "execa";
import path from "path";
import { runCli } from "../utils/run-cli";

describe("coat run - create", () => {
  test("should work as a local dependency in a freshly created coat project", async () => {
    const { cwd, task: createTask } = runCli([
      "create",
      "coat-dev/cli-e2e-tests-template#coat/e2e-test-template-run-1-v1.0.0",
      "project-name",
    ]);
    await createTask;

    const projectDir = path.join(cwd, "project-name");

    // Install built @coat/cli in project directory
    if (!process.env.COAT_CLI_TMP_TARBALL_PATH) {
      throw new Error(
        "Environment variable COAT_CLI_TMP_TARBALL_PATH must be set by e2e test setup in order for this test to run as expected."
      );
    }
    await execa("npm", ["install", process.env.COAT_CLI_TMP_TARBALL_PATH], {
      cwd: projectDir,
    });

    // Run coat run locally via npm
    const runTask = await execa("npm", ["run", "test-script"], {
      cwd: projectDir,
    });

    expect(runTask.stdout).toContain("Running test script 1");
    expect(runTask.stdout).toContain("Running test script 2");
  });
});
