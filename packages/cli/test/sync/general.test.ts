import path from "path";
import { promises as fs } from "fs";
import { runSyncTest, prepareSyncTest } from "../utils/run-sync-test";
import { runCli } from "../utils/run-cli";
import { CoatManifestFileType } from "../../src/types/coat-manifest-file";
import { PACKAGE_JSON_FILENAME } from "../../src/constants";

describe("coat sync - general", () => {
  test("should output help text correctly", async () => {
    const { task: helpArgumentPromise } = runCli(["sync", "--help"]);
    const { task: helpCommandPromise } = runCli(["help", "sync"]);

    const [helpArgument, helpCommand] = await Promise.all([
      helpArgumentPromise,
      helpCommandPromise,
    ]);

    expect(helpArgument.stdout).toEqual(helpCommand.stdout);
    expect(helpArgument.stdout).toMatchInlineSnapshot(`
      "Usage: coat sync [options]

      Generates all files of the current coat project.

      Options:
        -h, --help  
        
        Gathers all files of the extended templates, merges them and places them in the project directory.
        
        Generated files can be extended by placing a file next to it with the \\"-custom.js\\" suffix and exporting a function that returns the customized content."
    `);
  });

  test("should not run sync when help function is called", async () => {
    const testFile = "test.json";
    const tmpDir = await prepareSyncTest({
      coatManifest: {
        name: "test-project",
        files: [
          {
            file: testFile,
            content: {
              a: 1,
            },
            type: CoatManifestFileType.Json,
          },
        ],
      },
    });

    const { task: helpArgumentPromise } = runCli(["sync", "--help"], tmpDir);
    const { task: helpCommandPromise } = runCli(["help", "sync"], tmpDir);

    await Promise.all([helpArgumentPromise, helpCommandPromise]);

    // Ensure that target directory does not contain test.json file
    try {
      await fs.stat(path.join(tmpDir, testFile));

      throw new Error(
        "Code should not be reached, stat call should throw error"
      );
    } catch (error) {
      expect(error.message).toContain(
        "ENOENT: no such file or directory, stat"
      );
    }
  });

  test("should polish package.json even if coat manifest specified no action", async () => {
    const packageJsonContent = {
      name: "test-project",
      version: "1.0.0",
    };
    const { task, cwd } = await runSyncTest({
      packageJson: packageJsonContent,
    });
    await task;

    const packageJsonOnDisk = await fs.readFile(
      path.join(cwd, PACKAGE_JSON_FILENAME),
      "utf8"
    );

    expect(packageJsonOnDisk).toMatchInlineSnapshot(`
      "{
        \\"name\\": \\"test-project\\",
        \\"version\\": \\"1.0.0\\"
      }
      "
    `);
  });
});
