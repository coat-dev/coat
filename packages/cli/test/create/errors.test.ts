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
      // Remove lines that are environment dependent
      const errorMessages = error.stderr.split("\n").slice(0, 10).join("\n");
      expect(errorMessages).toMatchInlineSnapshot(`
          "npm ERR! code E404
          npm ERR! 404 Not Found - GET https://registry.npmjs.org/@coat%2fnon-existent-package - Not found
          npm ERR! 404 
          npm ERR! 404  '@coat/non-existent-package@latest' is not in the npm registry.
          npm ERR! 404 You should bug the author to publish it (or use the name yourself!)
          npm ERR! 404 
          npm ERR! 404 Note that you can also install from a
          npm ERR! 404 tarball, folder, http url, or git url.

          npm ERR! A complete log of this run can be found in:"
        `);
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
        ["create", "@coat/integration-test-template", "project-name"],
        tmpDir
      );
      await task;

      // This should not be reached, since the expectation is that
      // task throws an error
      throw new Error("Error! Task should have thrown an error");
    } catch (error) {
      expect(error.stderr).toMatchInlineSnapshot(
        `"Warning! The specified target diretory is not empty. Aborting to prevent accidental file loss or override."`
      );

      // targetDir should only contain one file
      const entries = await fs.readdir(targetFolder);
      expect(entries).toEqual(["file"]);
    }
  });
});
