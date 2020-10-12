import { runCli } from "../utils/run-cli";
import fs from "fs-extra";
import path from "path";
import { getTmpDir } from "../utils/get-tmp-dir";
import { COAT_MANIFEST_FILENAME } from "../../src/constants";

describe("coat create - errors", () => {
  test("should throw error if no template is specified", async () => {
    try {
      const { task } = runCli(["create"]);
      await task;

      // This should not be reached, since the expectation is that
      // task throws an error
      throw new Error("Error! Task should have thrown an error");
    } catch (error) {
      expect(error.stderr).toMatchInlineSnapshot(
        `"error: missing required argument 'template'"`
      );
    }
  });

  test("should throw error if template does not exist in registry", async () => {
    try {
      const { task } = runCli([
        "create",
        "@coat/non-existent-package",
        "project-name",
      ]);
      await task;

      // This should not be reached, since the expectation is that
      // task throws an error
      throw new Error("Error! Task should have thrown an error");
    } catch (error) {
      expect(error.stderr).toEqual(
        expect.stringContaining(
          "npm ERR! 404 Not Found - GET https://registry.npmjs.org/@coat%2fnon-existent-package - Not found"
        )
      );
    }
  });

  test("should throw error if target directory contains a coat manifest file", async () => {
    const tmpDir = getTmpDir();
    const targetFolder = path.join(tmpDir, "project-name");
    await fs.outputFile(path.join(targetFolder, COAT_MANIFEST_FILENAME), "{}");

    try {
      const { task } = runCli(
        ["create", "@coat/e2e-test-template", "project-name"],
        { cwd: tmpDir }
      );
      await task;

      // This should not be reached, since the expectation is that
      // task throws an error
      throw new Error("Error! Task should have thrown an error");
    } catch (error) {
      expect(error.stderr).toContain(
        "A coat manifest file already exists in the target directory.\n\nPlease install the template manually via npm and add the name of the template to the existing coat manifest file."
      );

      // targetDir should only contain one file
      const entries = await fs.readdir(targetFolder);
      expect(entries).toEqual([COAT_MANIFEST_FILENAME]);
    }
  });
});
