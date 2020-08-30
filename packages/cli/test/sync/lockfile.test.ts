import { promises as fs } from "fs";
import path from "path";
import yaml from "js-yaml";
import { COAT_LOCKFILE_FILENAME } from "../../src/constants";
import { runSyncTest } from "../utils/run-sync-test";
import { CoatManifestFileType } from "../../src/types/coat-manifest-file";

describe("coat sync - lockfile", () => {
  test("should generate a lockfile with version 1", async () => {
    const { cwd, task } = await runSyncTest();

    await task;
    const lockFileRaw = await fs.readFile(
      path.join(cwd, COAT_LOCKFILE_FILENAME),
      "utf-8"
    );
    expect(lockFileRaw).toMatchInlineSnapshot(`
      "files: []
      version: 1
      "
    `);

    const lockFile = yaml.safeLoad(lockFileRaw);
    expect(lockFile).toHaveProperty("version", 1);
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
      path.join(cwd, COAT_LOCKFILE_FILENAME),
      "utf-8"
    );
    expect(lockfileRaw).toMatchInlineSnapshot(`
      "files:
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
