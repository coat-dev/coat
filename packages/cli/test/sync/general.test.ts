import path from "path";
import { promises as fs } from "fs";
import { runSyncTest, prepareCliTest } from "../utils/run-cli-test";
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

    const helpLines = [
      "Usage: coat sync [options]",
      "Generates all files of the current coat project.",
      "Gathers all files of the extended templates, merges them and places them in the project directory.",
      'Generated files can be extended by placing a file next to it with the "-custom.js" suffix and exporting a function that returns the customized content.',
      "--check",
      "Checks whether the coat project is in sync or whether there are",
      "any pending global file operations. Useful on CI systems to",
      "determine whether coat sync needs to be run.",
    ];
    helpLines.forEach((helpLine) => {
      expect(helpArgument.stdout).toContain(helpLine);
    });
  });

  test("should not run sync when help function is called", async () => {
    const testFile = "test.json";
    const tmpDir = await prepareCliTest({
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

    const { task: helpArgumentPromise } = runCli(["sync", "--help"], {
      cwd: tmpDir,
    });
    const { task: helpCommandPromise } = runCli(["help", "sync"], {
      cwd: tmpDir,
    });

    await Promise.all([helpArgumentPromise, helpCommandPromise]);

    // Ensure that target directory does not contain test.json file
    try {
      await fs.stat(path.join(tmpDir, testFile));

      throw new Error(
        "Code should not be reached, stat call should throw error"
      );
    } catch (error) {
      expect((error as Error).message).toContain(
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

  test("should work without a package.json file", async () => {
    const cwd = await prepareCliTest();

    // Remove package.json file
    await fs.unlink(path.join(cwd, PACKAGE_JSON_FILENAME));

    // Run sync
    const { task } = runCli(["sync"], { cwd });
    await task;

    await expect(
      fs.readFile(path.join(cwd, PACKAGE_JSON_FILENAME))
    ).rejects.toHaveProperty(
      "message",
      expect.stringMatching(
        /ENOENT: no such file or directory, open '.*package.json'/
      )
    );
  });
});
