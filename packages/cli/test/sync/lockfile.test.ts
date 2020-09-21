import { promises as fs } from "fs";
import path from "path";
import {
  COAT_GLOBAL_LOCKFILE_PATH,
  COAT_LOCAL_LOCKFILE_PATH,
} from "../../src/constants";
import { runSyncTest } from "../utils/run-cli-test";
import { CoatManifestFileType } from "../../src/types/coat-manifest-file";

describe("coat sync - lockfile", () => {
  describe("global", () => {
    test("should not generate lockfile if there is no need to write one", async () => {
      const { cwd, task } = await runSyncTest({
        coatManifest: {
          name: "test",
          files: [
            {
              file: ".gitignore",
              content: null,
              type: CoatManifestFileType.Text,
            },
          ],
        },
      });

      await task;
      await expect(
        fs.readFile(path.join(cwd, COAT_GLOBAL_LOCKFILE_PATH), "utf-8")
      ).rejects.toHaveProperty(
        "message",
        expect.stringMatching(
          /ENOENT: no such file or directory, open.*coat.lock/
        )
      );
    });

    test("should add generated files to the lockfile", async () => {
      // Test with a few files, some from a template, two in a subfolder
      const { cwd, task } = await runSyncTest({
        coatManifest: {
          name: "project",
          extends: [
            "local-files-1",
            "local-files-2",
            "local-files-3",
          ].map((templateName) =>
            path.join(__dirname, "..", "utils", "test-packages", templateName)
          ),
          files: [
            {
              file: "folder-1/file-1.json",
              content: {},
              type: CoatManifestFileType.Json,
            },
            {
              file: "folder-2/sub-folder-1/file-2.json",
              content: {
                a: true,
              },
              type: CoatManifestFileType.Json,
            },
          ],
        },
      });
      await task;

      const lockfileRaw = await fs.readFile(
        path.join(cwd, COAT_GLOBAL_LOCKFILE_PATH),
        "utf-8"
      );
      expect(lockfileRaw).toMatchInlineSnapshot(`
      "files:
        - once: true
          path: .gitignore
        - path: a.json
        - path: b.txt
        - path: c.txt
        - path: folder-1/file-1.json
        - path: folder-2/sub-folder-1/file-2.json
      version: 1
      "
    `);
    });
  });

  describe("local", () => {
    test("should not generate lockfile if there is no need to write one", async () => {
      const { cwd, task } = await runSyncTest();

      await task;
      await expect(
        fs.readFile(path.join(cwd, COAT_LOCAL_LOCKFILE_PATH), "utf-8")
      ).rejects.toHaveProperty(
        "message",
        expect.stringMatching(
          /ENOENT: no such file or directory, open.*coat.lock/
        )
      );
    });

    test("should add generated files to the lockfile", async () => {
      // Test with a few files, some from a template, two in a subfolder
      const { cwd, task } = await runSyncTest({
        coatManifest: {
          name: "project",
          extends: ["local-files-8"].map((templateName) =>
            path.join(__dirname, "..", "utils", "test-packages", templateName)
          ),
          files: [
            {
              file: "folder-1/file-1.json",
              content: {},
              local: true,
              type: CoatManifestFileType.Json,
            },
            {
              file: "folder-2/sub-folder-1/file-2.json",
              content: {
                a: true,
              },
              local: true,
              type: CoatManifestFileType.Json,
            },
          ],
        },
      });
      await task;

      const lockfileRaw = await fs.readFile(
        path.join(cwd, COAT_LOCAL_LOCKFILE_PATH),
        "utf-8"
      );
      expect(lockfileRaw).toMatchInlineSnapshot(`
      "files:
        - once: true
          path: a.json
        - once: true
          path: b.json
        - path: folder-1/c.json
        - path: folder-1/file-1.json
        - path: folder-2/sub-folder-1/file-2.json
      version: 1
      "
    `);
    });
  });
});
