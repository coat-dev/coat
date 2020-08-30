import { promises as fs } from "fs";
import path from "path";
import { runCli } from "../utils/run-cli";

describe("coat create - sync", () => {
  test("should run sync locally with the installed @coat/cli", async () => {
    // There is a template which uses a mocked version of the @coat/cli
    // in order to verify that this integration works
    // See: https://github.com/coat-dev/cli-integration-tests-template/tree/cli-mock-template
    const { task } = runCli([
      "create",
      "coat-dev/cli-integration-tests-template#cli-mock-template",
      "project-name",
    ]);
    const result = await task;
    expect(result.stdout).toContain("[MOCK CLI] called with: sync");
  });

  test("should run sync directly if @coat/cli was not installed in the package", async () => {
    const { task, cwd } = runCli([
      "create",
      "coat-dev/cli-integration-tests-template#coat/integration-test-template-create-1-v1.0.0",
      "project-name",
    ]);
    await task;

    // Verify that file from template has been created
    const fileRaw = await fs.readFile(
      path.join(cwd, "project-name", "integration-test-template-create-1.json"),
      "utf-8"
    );
    expect(JSON.parse(fileRaw)).toEqual({
      a: 1,
    });
  });
});
