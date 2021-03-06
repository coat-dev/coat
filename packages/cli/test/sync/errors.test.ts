import { promises as fs } from "fs";
import path from "path";
import { prepareCliTest, runSyncTest } from "../utils/run-cli-test";
import {
  COAT_MANIFEST_FILENAME,
  PACKAGE_JSON_FILENAME,
} from "../../src/constants";
import { runCli } from "../utils/run-cli";
import { CoatManifestFileType } from "../../src/types/coat-manifest-file";
import { testExceptWindows } from "../utils/test-except-windows";

describe("coat sync - errors", () => {
  test("should throw an error if coat manifest is missing", async () => {
    const tmpDir = await prepareCliTest();
    // Delete coat manifest file
    await fs.unlink(path.join(tmpDir, COAT_MANIFEST_FILENAME));

    const { task } = runCli(["sync"], { cwd: tmpDir });
    try {
      await task;
      throw new Error("This error should not be reached. Task should throw");
    } catch (error) {
      expect(
        error.stderr.includes("Error: ENOENT: no such file or directory,")
      ).toBe(true);
      expect(error.stderr.includes("coat.json")).toBe(true);
    }
  });

  test("should throw error if template can't be imported", async () => {
    const templateName = "test-template";
    const { task } = await runSyncTest({
      coatManifest: {
        name: "project",
        extends: templateName,
      },
    });

    try {
      await task;
      throw new Error("This error should not be reached. Task should throw");
    } catch (error) {
      expect(error.stderr.includes("Cannot find module 'test-template'")).toBe(
        true
      );
    }
  });

  test("should throw error for unsupported file type in files", async () => {
    const { task } = await runSyncTest({
      coatManifest: {
        name: "project",
        files: [
          {
            content: { a: 1 },
            file: "file.json",
            // @ts-expect-error
            type: "UNSUPPORTED_FILE_TYPE",
          },
        ],
      },
    });

    try {
      await task;
      throw new Error("This error should not be reached. Task should throw");
    } catch (error) {
      expect(
        error.stderr.includes(
          "Error: Cannot merge unknown file type: UNSUPPORTED_FILE_TYPE"
        )
      ).toBe(true);
    }
  });

  testExceptWindows(
    "should throw error when coat.json can't be read",
    async () => {
      const tmpDir = await prepareCliTest();
      // Remove coat.json read permissions
      await fs.chmod(path.join(tmpDir, COAT_MANIFEST_FILENAME), "222");

      const { task } = runCli(["sync"], { cwd: tmpDir });
      try {
        await task;
        throw new Error("This error should not be reached. Task should throw");
      } catch (error) {
        expect(error.stderr.includes("Error: EACCES: permission denied,")).toBe(
          true
        );
        expect(error.stderr.includes("coat.json")).toBe(true);
      }
    }
  );

  testExceptWindows(
    "should throw error when package.json can't be read",
    async () => {
      const tmpDir = await prepareCliTest();
      // Remove package.json read permissions
      await fs.chmod(path.join(tmpDir, PACKAGE_JSON_FILENAME), "222");

      const { task } = runCli(["sync"], { cwd: tmpDir });
      try {
        await task;
        throw new Error("This error should not be reached. Task should throw");
      } catch (error) {
        expect(error.stderr.includes("Error: EACCES: permission denied,")).toBe(
          true
        );
        expect(error.stderr.includes("package.json")).toBe(true);
      }
    }
  );

  testExceptWindows(
    "should throw error when current files can't be accessed due to missing read permissions",
    async () => {
      const fileFolderName = "some-folder";
      const tmpDir = await prepareCliTest({
        coatManifest: {
          name: "project",
          files: [
            {
              content: {
                a: 1,
              },
              file: path.join(fileFolderName, "file.json"),
              type: CoatManifestFileType.Json,
            },
          ],
        },
      });
      // Create and remove read permissions for file folder
      const fileFolderPath = path.join(tmpDir, fileFolderName);
      await fs.mkdir(fileFolderPath);
      await fs.chmod(fileFolderPath, "222");

      const { task } = runCli(["sync"], { cwd: tmpDir });
      try {
        await task;
        throw new Error("This error should not be reached. Task should throw");
      } catch (error) {
        expect(error.stderr.includes("Error: EACCES: permission denied,")).toBe(
          true
        );
        expect(
          error.stderr.includes(path.join("some-folder", "file.json"))
        ).toBe(true);
      }
    }
  );
});
