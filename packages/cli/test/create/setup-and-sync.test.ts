import { runCli } from "../utils/run-cli";

describe("coat create - setup & sync", () => {
  describe("setup", () => {
    test("should run setup locally with the installed @coat/cli", async () => {
      // There is a template which uses a mocked version of the @coat/cli
      // in order to verify that this integration works
      // See: https://github.com/coat-dev/cli-integration-tests-template/tree/cli-mock-template
      const { task } = runCli([
        "create",
        "coat-dev/cli-integration-tests-template#cli-mock-template",
        "project-name",
      ]);
      const result = await task;
      expect(result.stdout).toContain("[MOCK CLI] called with: setup");
    });

    // Add test once setup functionality is added (See #8)
    test.todo(`See #8
      should run setup directly if @coat/cli was not installed in the package
    `);
  });

  describe("sync", () => {
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

    // Add test once setup functionality is added (see #5)
    test.todo(`See #5
      should run sync directly if @coat/cli was not installed in the package
    `);
  });
});
