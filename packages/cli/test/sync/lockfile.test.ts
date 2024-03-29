import { promises as fs } from "fs";
import path from "path";
import stripAnsi from "strip-ansi";
import yaml from "js-yaml";
import {
  COAT_GLOBAL_LOCKFILE_PATH,
  COAT_GLOBAL_LOCKFILE_VERSION,
  COAT_LOCAL_LOCKFILE_PATH,
  COAT_LOCAL_LOCKFILE_VERSION,
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
          extends: ["local-files-1", "local-files-2", "local-files-3"].map(
            (templateName) =>
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
          - hash: >-
              v6bfCEU3zI5CvHK4VPTEpin/6nRxdKpbtupWZHrRxXISgdXuSYoJ3P/rXSw4QXq8iDn9gHA8LrhgbGCjI2YZ8w==
            path: a.json
          - hash: >-
              YtzEIVCxFq9Sxj0THGMVMM7hgRPRC3imGCQF8R92bKVMm1KS1EDdsA2HRqCyTj1BMsZm4RCkS65m1VVh0VDMZg==
            path: b.txt
          - hash: >-
              YtzEIVCxFq9Sxj0THGMVMM7hgRPRC3imGCQF8R92bKVMm1KS1EDdsA2HRqCyTj1BMsZm4RCkS65m1VVh0VDMZg==
            path: c.txt
          - hash: >-
              IrcZL7+2o2PjMGkyvjKOc7oUycXOkr14eRdN5oaxHsVsXbdBgutrHNJxJqAqZaJZtD9lP5TR3B25uBRaDw5rNw==
            path: folder-1/file-1.json
          - hash: >-
              ioXVe7GMp+a3Q+PT1mWtLxB4opOl29lTr0zke8SgoRpBkipR3m5LZ6od36VBT39w8WwWzmVa+Pviyl8123ftHA==
            path: folder-2/sub-folder-1/file-2.json
        version: 1
        "
      `);
    });

    test("should warn if lockfile does not match expected schema", async () => {
      const { task } = await runSyncTest({
        coatGlobalLockfile: {
          version: COAT_GLOBAL_LOCKFILE_VERSION,
          files: [{ path: "test-path", hash: "" }],
        },
      });
      const taskResult = await task;

      const stderr = stripAnsi(taskResult.stderr);
      expect(stderr).toMatchInlineSnapshot(
        `"Warning! The global lockfile coat.lock does not conform to the expected schema! Consider deleting and regenerating the lockfile by running coat sync in case you run into any issues."`
      );
    });

    test("should warn if the lockfile version is higher than the currently supported version", async () => {
      const { task } = await runSyncTest({
        coatGlobalLockfile: {
          version: COAT_GLOBAL_LOCKFILE_VERSION + 1,
        },
      });
      const taskResult = await task;

      const stderr = stripAnsi(taskResult.stderr);
      expect(stderr).toMatchInlineSnapshot(
        `"Warning! The global lockfile coat.lock version (2) is higher than the expected version (1) by the currently running cli. Please ensure that you are running the newest version of the @coat/cli since the current project might not be backwards compatible with the current cli version."`
      );
    });

    test("should update the lockfile version even if no other lockfile update is needed", async () => {
      const { task, cwd } = await runSyncTest({
        coatGlobalLockfile: {
          version: COAT_GLOBAL_LOCKFILE_VERSION + 1,
        },
      });
      await task;

      const lockfileRaw = await fs.readFile(
        path.join(cwd, COAT_GLOBAL_LOCKFILE_PATH),
        "utf-8"
      );
      const lockfile = yaml.load(lockfileRaw);

      expect(lockfile).toHaveProperty("version", COAT_GLOBAL_LOCKFILE_VERSION);
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
          - hash: >-
              Qg2v+Js6RhKHE8rpPLhYFB4S8ohdDXuB1P8sMtVnhgW3CvpIdQDI5ZvpDZy0ERqb8YQWX53PiRwnRPE9yg4PQQ==
            path: folder-1/c.json
          - hash: >-
              IrcZL7+2o2PjMGkyvjKOc7oUycXOkr14eRdN5oaxHsVsXbdBgutrHNJxJqAqZaJZtD9lP5TR3B25uBRaDw5rNw==
            path: folder-1/file-1.json
          - hash: >-
              ioXVe7GMp+a3Q+PT1mWtLxB4opOl29lTr0zke8SgoRpBkipR3m5LZ6od36VBT39w8WwWzmVa+Pviyl8123ftHA==
            path: folder-2/sub-folder-1/file-2.json
        version: 1
        "
      `);
    });

    test("should warn if lockfile does not match expected schema", async () => {
      const { task } = await runSyncTest({
        coatLocalLockfile: {
          version: COAT_LOCAL_LOCKFILE_VERSION,
          files: [{ path: "test-path", hash: "" }],
        },
      });
      const taskResult = await task;

      const stderr = stripAnsi(taskResult.stderr);
      expect(stderr).toContain(
        `Warning! The local lockfile ${COAT_LOCAL_LOCKFILE_PATH} does not conform to the expected schema! Consider deleting and regenerating the lockfile by running coat sync in case you run into any issues.`
      );
    });

    test("should warn if the lockfile version is higher than the currently supported version", async () => {
      const { task } = await runSyncTest({
        coatLocalLockfile: {
          version: COAT_LOCAL_LOCKFILE_VERSION + 1,
        },
      });
      const taskResult = await task;

      const stderr = stripAnsi(taskResult.stderr);
      expect(stderr).toContain(
        `Warning! The local lockfile ${COAT_LOCAL_LOCKFILE_PATH} version (${
          COAT_LOCAL_LOCKFILE_VERSION + 1
        }) is higher than the expected version (${COAT_GLOBAL_LOCKFILE_VERSION}) by the currently running cli. Please ensure that you are running the newest version of the @coat/cli since the current project might not be backwards compatible with the current cli version.`
      );
    });

    test("should update the lockfile version even if no other lockfile update is needed", async () => {
      const { task, cwd } = await runSyncTest({
        coatLocalLockfile: {
          version: COAT_LOCAL_LOCKFILE_VERSION + 1,
        },
      });
      await task;

      const lockfileRaw = await fs.readFile(
        path.join(cwd, COAT_LOCAL_LOCKFILE_PATH),
        "utf-8"
      );
      const lockfile = yaml.load(lockfileRaw);

      expect(lockfile).toHaveProperty("version", COAT_LOCAL_LOCKFILE_VERSION);
    });
  });
});
