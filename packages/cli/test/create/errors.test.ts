import { runCli } from "../utils/run-cli";
import { promises as fs } from "fs";
import path from "path";
import { getTmpDir } from "../utils/get-tmp-dir";

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

  test("should not create target directory and files if template does not exist in registry", async () => {
    let tmpDir: string | undefined;
    try {
      const { task, cwd } = runCli([
        "create",
        "@coat/non-existent-package",
        "project-name",
      ]);
      tmpDir = cwd;
      await task;

      // This should not be reached, since the expectation is that
      // task throws an error
      throw new Error("Error! Task should have thrown an error");
    } catch (error) {
      if (!tmpDir) {
        throw new Error("Could not create/retrieve tmpDir");
      }
      // The project-name folder should not have been created
      const entries = await fs.readdir(tmpDir);
      expect(entries).toEqual([]);
    }
  });

  test("should throw error if target directory is not empty", async () => {
    const tmpDir = getTmpDir();
    const targetFolder = path.join(tmpDir, "project-name");
    await fs.mkdir(targetFolder);
    await fs.writeFile(path.join(targetFolder, "file"), "");

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
        "Warning! The specified target diretory is not empty. Aborting to prevent accidental file loss or override."
      );

      // targetDir should only contain one file
      const entries = await fs.readdir(targetFolder);
      expect(entries).toEqual(["file"]);
    }
  });
});
