import { promises as fs } from "fs";
import path from "path";
import { runCli } from "../utils/run-cli";

describe("coat create - sync", () => {
  test("should run sync locally with the installed @coat/cli", async () => {
    // There is a template which uses a mocked version of the @coat/cli
    // in order to verify that this integration works
    // See: https://github.com/coat-dev/cli-e2e-tests-template/tree/%40coat/e2e-test-template-cli-mock
    const { task } = runCli([
      "create",
      "coat-dev/cli-e2e-tests-template#coat/e2e-test-template-cli-mock",
      "project-name",
    ]);
    const result = await task;
    expect(result.stdout).toContain("[MOCK CLI] called with: sync");
  });

  test("should run sync directly if @coat/cli was not installed in the package", async () => {
    const localCreateTemplate = path.join(
      __dirname,
      "..",
      "utils",
      "test-packages",
      "local-create-template-1"
    );
    const { task, cwd } = runCli([
      "create",
      localCreateTemplate,
      "project-name",
    ]);
    await task;

    // Verify that file from template has been created
    const fileRaw = await fs.readFile(
      path.join(cwd, "project-name", "a.json"),
      "utf-8"
    );
    expect(JSON.parse(fileRaw)).toEqual({
      a: true,
    });
  });
});
