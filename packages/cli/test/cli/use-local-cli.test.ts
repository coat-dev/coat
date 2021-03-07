import execa from "execa";
import { runCli } from "../utils/run-cli";
import { prepareCliTest } from "../utils/run-cli-test";

describe("coat - local cli", () => {
  test("should use local cli version when running coat in a project where @coat/cli is installed locally", async () => {
    const cwd = await prepareCliTest({
      coatManifest: {
        name: "test-project",
        extends: "cli-e2e-tests-template",
      },
      packageJson: {
        devDependencies: {
          // There is a template which uses a mocked version of the @coat/cli
          // in order to verify that this integration works
          // See: https://github.com/coat-dev/cli-e2e-tests-template/tree/%40coat/e2e-test-template-cli-mock
          "cli-e2e-tests-template":
            "coat-dev/cli-e2e-tests-template#coat/e2e-test-template-cli-mock",
        },
      },
    });

    // Install dependencies
    await execa("npm", ["install"], { cwd });

    const taskInputs = [["sync"], ["setup"], ["run", "my-script"]];
    const tasks = await Promise.all(
      taskInputs.map(async (taskInput) => {
        const { task } = runCli(taskInput, { cwd });
        const taskResult = await task;
        return {
          taskInput,
          taskResult,
        };
      })
    );

    tasks.forEach((task) => {
      expect(task.taskResult.stdout).toEqual(
        `[MOCK CLI] called with: ${task.taskInput.join(" ")}`
      );
    });
  });
});
