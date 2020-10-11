import fs from "fs-extra";
import path from "path";
import { vol } from "memfs";
import { prompt } from "inquirer";
import { updateFilesOnDisk } from "./update-files-on-disk";
import { getStrictCoatManifest } from "../util/get-strict-coat-manifest";
import {
  getStrictCoatGlobalLockfile,
  getStrictCoatLocalLockfile,
} from "../lockfiles/get-strict-coat-lockfiles";
import {
  COAT_GLOBAL_LOCKFILE_VERSION,
  COAT_LOCAL_LOCKFILE_VERSION,
  PACKAGE_JSON_FILENAME,
} from "../constants";
import { CoatContext } from "../types/coat-context";
import { PolishedFile } from "./polish-files";
import { getFileHash } from "../util/get-file-hash";
import { CoatManifestFileType } from "../types/coat-manifest-file";
import stripAnsi from "strip-ansi";
import produce from "immer";
import { getCurrentFiles } from "./get-current-files";
import { getNormalizedFilePath } from "../util/get-normalized-file-path";
import { CoatLockfileContinuousFileEntryStrict } from "../types/coat-lockfiles";

jest.mock("fs").mock("inquirer");

const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {
  // Empty function
});
const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {
  // Empty function
});

const exitSpy = jest.spyOn(process, "exit").mockImplementation((): never => {
  throw new Error("process.exit");
});

const promptsMock = (prompt as unknown) as jest.Mock;
// Default return value for prompts
promptsMock.mockReturnValue({
  filesToPlacePrompted: false,
});

describe("sync/update-files-on-disk", () => {
  afterEach(() => {
    jest.clearAllMocks();
    vol.reset();
  });

  const platformRoot = path.parse(process.cwd()).root;
  const testCwd = path.join(platformRoot, "test");
  const testContext: CoatContext = {
    cwd: testCwd,
    coatManifest: getStrictCoatManifest({
      name: "test",
    }),
    packageJson: {},
    coatGlobalLockfile: getStrictCoatGlobalLockfile({
      version: COAT_GLOBAL_LOCKFILE_VERSION,
    }),
    coatLocalLockfile: getStrictCoatLocalLockfile({
      version: COAT_LOCAL_LOCKFILE_VERSION,
    }),
  };
  const upToDateMessage = "\n♻️ Everything up to date\n";

  async function getCurrentFilesForTest(
    context: CoatContext,
    filesToPlace: PolishedFile[],
    filesToRemove: CoatLockfileContinuousFileEntryStrict[]
  ): Promise<Record<string, string | undefined>> {
    const paths = [
      ...context.coatGlobalLockfile.files.map((file) => file.path),
      ...context.coatLocalLockfile.files.map((file) => file.path),
      ...filesToPlace.map((file) => file.relativePath),
      ...filesToRemove.map((file) => file.path),
    ].map((filePath) => getNormalizedFilePath(filePath, context));
    const result = await getCurrentFiles(paths);
    return result;
  }

  test("should work with empty place and remove file arrays", async () => {
    await updateFilesOnDisk([], [], {}, testContext);

    expect(promptsMock).toHaveBeenCalledTimes(0);
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy).toHaveBeenLastCalledWith(upToDateMessage);
  });

  test("should place all files without prompting if files don't exist yet", async () => {
    const filesToPlace: PolishedFile[] = [
      {
        file: path.join(testCwd, "folder-1", "a.json"),
        type: CoatManifestFileType.Json,
        relativePath: "folder-1/a.json",
        content: JSON.stringify({ a: "new" }),
        hash: getFileHash(JSON.stringify({ a: "new" })),
        local: false,
        once: false,
      },
      {
        file: path.join(testCwd, "folder-1", "b.json"),
        type: CoatManifestFileType.Json,
        relativePath: "folder-1/b.json",
        content: JSON.stringify({ b: "new" }),
        hash: getFileHash(JSON.stringify({ b: "new" })),
        local: true,
        once: false,
      },
      {
        file: path.join(testCwd, "c.txt"),
        type: CoatManifestFileType.Text,
        relativePath: "c.txt",
        content: "Test Text",
        local: false,
        once: true,
      },
    ];
    await updateFilesOnDisk(filesToPlace, [], {}, testContext);

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const consoleMessage = stripAnsi(consoleLogSpy.mock.calls[0][0]);
    expect(consoleMessage).toMatchInlineSnapshot(`
      "
        CREATED  c.txt
        CREATED  folder-1/a.json
        CREATED  folder-1/b.json
      "
    `);

    const [aJsonRaw, bJsonRaw, cTxt] = await Promise.all([
      fs.readFile(path.join(testCwd, "folder-1", "a.json"), "utf-8"),
      fs.readFile(path.join(testCwd, "folder-1", "b.json"), "utf-8"),
      fs.readFile(path.join(testCwd, "c.txt"), "utf-8"),
    ]);

    const aJson = JSON.parse(aJsonRaw);
    const bJson = JSON.parse(bJsonRaw);

    expect(aJson).toMatchInlineSnapshot(`
      Object {
        "a": "new",
      }
    `);
    expect(bJson).toMatchInlineSnapshot(`
      Object {
        "b": "new",
      }
    `);
    expect(cTxt).toMatchInlineSnapshot(`"Test Text"`);
  });

  test("should update files without prompting if files have not changed from lockfile entry", async () => {
    // Put old files on disk and lockfile
    await Promise.all([
      fs.outputFile(
        path.join(testCwd, "folder-1", "a.json"),
        JSON.stringify({ a: true })
      ),
      fs.outputFile(
        path.join(testCwd, "folder-1", "b.json"),
        JSON.stringify({ b: true })
      ),
    ]);
    const context: CoatContext = produce(testContext, (newContext) => {
      newContext.coatGlobalLockfile.files.push({
        path: "folder-1/a.json",
        hash: getFileHash(JSON.stringify({ a: true })),
        once: false,
      });
      newContext.coatLocalLockfile.files.push({
        path: "folder-1/b.json",
        hash: getFileHash(JSON.stringify({ b: true })),
        once: false,
      });
    });

    const filesToPlace: PolishedFile[] = [
      {
        file: path.join(testCwd, "folder-1", "a.json"),
        type: CoatManifestFileType.Json,
        relativePath: "folder-1/a.json",
        content: JSON.stringify({ a: "new" }),
        hash: getFileHash(JSON.stringify({ a: "new" })),
        local: false,
        once: false,
      },
      {
        file: path.join(testCwd, "folder-1", "b.json"),
        type: CoatManifestFileType.Json,
        relativePath: "folder-1/b.json",
        content: JSON.stringify({ b: "new" }),
        hash: getFileHash(JSON.stringify({ b: "new" })),
        local: true,
        once: false,
      },
    ];
    const currentFiles = await getCurrentFilesForTest(
      context,
      filesToPlace,
      []
    );
    await updateFilesOnDisk(filesToPlace, [], currentFiles, context);

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const consoleMessage = stripAnsi(consoleLogSpy.mock.calls[0][0]);
    expect(consoleMessage).toMatchInlineSnapshot(`
      "
        UPDATED  folder-1/a.json
        UPDATED  folder-1/b.json
      "
    `);

    const [aJsonRaw, bJsonRaw] = await Promise.all([
      fs.readFile(path.join(testCwd, "folder-1", "a.json"), "utf-8"),
      fs.readFile(path.join(testCwd, "folder-1", "b.json"), "utf-8"),
    ]);

    const aJson = JSON.parse(aJsonRaw);
    const bJson = JSON.parse(bJsonRaw);

    expect(aJson).toMatchInlineSnapshot(`
      Object {
        "a": "new",
      }
    `);
    expect(bJson).toMatchInlineSnapshot(`
      Object {
        "b": "new",
      }
    `);
  });

  test("should not update files if all files are up-to-date on the disk", async () => {
    // Put files on disk and lockfile
    await Promise.all([
      fs.outputFile(
        path.join(testCwd, "folder-1", "a.json"),
        JSON.stringify({ a: true })
      ),
      fs.outputFile(
        path.join(testCwd, "folder-1", "b.json"),
        JSON.stringify({ b: true })
      ),
    ]);
    const context: CoatContext = produce(testContext, (newContext) => {
      newContext.coatGlobalLockfile.files.push({
        path: "folder-1/a.json",
        hash: getFileHash(JSON.stringify({ a: true })),
        once: false,
      });
      newContext.coatLocalLockfile.files.push({
        path: "folder-1/b.json",
        hash: getFileHash(JSON.stringify({ b: true })),
        once: false,
      });
    });

    const filesToPlace: PolishedFile[] = [
      {
        file: path.join(testCwd, "folder-1", "a.json"),
        type: CoatManifestFileType.Json,
        relativePath: "folder-1/a.json",
        content: JSON.stringify({ a: true }),
        hash: getFileHash(JSON.stringify({ a: true })),
        local: false,
        once: false,
      },
      {
        file: path.join(testCwd, "folder-1", "b.json"),
        type: CoatManifestFileType.Json,
        relativePath: "folder-1/b.json",
        content: JSON.stringify({ b: true }),
        hash: getFileHash(JSON.stringify({ b: true })),
        local: true,
        once: false,
      },
    ];
    const currentFiles = await getCurrentFilesForTest(
      context,
      filesToPlace,
      []
    );
    await updateFilesOnDisk(filesToPlace, [], currentFiles, context);

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy).toHaveBeenLastCalledWith(upToDateMessage);

    const [aJsonRaw, bJsonRaw] = await Promise.all([
      fs.readFile(path.join(testCwd, "folder-1", "a.json"), "utf-8"),
      fs.readFile(path.join(testCwd, "folder-1", "b.json"), "utf-8"),
    ]);

    const aJson = JSON.parse(aJsonRaw);
    const bJson = JSON.parse(bJsonRaw);

    expect(aJson).toMatchInlineSnapshot(`
      Object {
        "a": true,
      }
    `);
    expect(bJson).toMatchInlineSnapshot(`
      Object {
        "b": true,
      }
    `);
  });

  test("should not log if once file would be placed but it already exists with the same content", async () => {
    // Put once files on disk
    await Promise.all([
      fs.outputFile(
        path.join(testCwd, "folder-1", "a.json"),
        JSON.stringify({ a: true })
      ),
      fs.outputFile(
        path.join(testCwd, "folder-1", "b.json"),
        JSON.stringify({ b: true })
      ),
    ]);

    const filesToPlace: PolishedFile[] = [
      {
        file: path.join(testCwd, "folder-1", "a.json"),
        type: CoatManifestFileType.Json,
        relativePath: "folder-1/a.json",
        content: JSON.stringify({ a: true }),
        local: false,
        once: true,
      },
      {
        file: path.join(testCwd, "folder-1", "b.json"),
        type: CoatManifestFileType.Json,
        relativePath: "folder-1/b.json",
        content: JSON.stringify({ b: true }),
        local: true,
        once: true,
      },
    ];

    const currentFiles = await getCurrentFilesForTest(
      testContext,
      filesToPlace,
      []
    );
    await updateFilesOnDisk(filesToPlace, [], currentFiles, testContext);

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy).toHaveBeenLastCalledWith(upToDateMessage);

    const [aJsonRaw, bJsonRaw] = await Promise.all([
      fs.readFile(path.join(testCwd, "folder-1", "a.json"), "utf-8"),
      fs.readFile(path.join(testCwd, "folder-1", "b.json"), "utf-8"),
    ]);

    const aJson = JSON.parse(aJsonRaw);
    const bJson = JSON.parse(bJsonRaw);

    expect(aJson).toMatchInlineSnapshot(`
      Object {
        "a": true,
      }
    `);
    expect(bJson).toMatchInlineSnapshot(`
      Object {
        "b": true,
      }
    `);
  });

  test("should not try to delete files that are no longer on the disk", async () => {
    const context: CoatContext = produce(testContext, (newContext) => {
      newContext.coatGlobalLockfile.files.push({
        path: "folder-1/a.json",
        hash: getFileHash(JSON.stringify({ a: true })),
        once: false,
      });
      newContext.coatLocalLockfile.files.push({
        path: "folder-1/b.json",
        hash: getFileHash(JSON.stringify({ b: true })),
        once: false,
      });
    });

    const filesToPlace: PolishedFile[] = [];
    const filesToRemove: CoatLockfileContinuousFileEntryStrict[] = [
      {
        path: "folder-1/a.json",
        once: false,
        hash: getFileHash(JSON.stringify({ a: true })),
      },
      {
        path: "folder-1/b.json",
        once: false,
        hash: getFileHash(JSON.stringify({ b: true })),
      },
    ];
    const currentFiles = await getCurrentFilesForTest(
      context,
      filesToPlace,
      filesToRemove
    );
    await updateFilesOnDisk(filesToPlace, filesToRemove, currentFiles, context);

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const logMessage = consoleLogSpy.mock.calls[0][0];
    expect(stripAnsi(logMessage)).toEqual(upToDateMessage);
  });

  test("should delete files without prompting if content has not changed from lockfile entry", async () => {
    // Put files on disk and lockfile
    await Promise.all([
      fs.outputFile(
        path.join(testCwd, "folder-1", "a.json"),
        JSON.stringify({ a: true })
      ),
      fs.outputFile(
        path.join(testCwd, "folder-1", "b.json"),
        JSON.stringify({ b: true })
      ),
    ]);

    const context: CoatContext = produce(testContext, (newContext) => {
      newContext.coatGlobalLockfile.files.push({
        path: "folder-1/a.json",
        hash: getFileHash(JSON.stringify({ a: true })),
        once: false,
      });
      newContext.coatLocalLockfile.files.push({
        path: "folder-1/b.json",
        hash: getFileHash(JSON.stringify({ b: true })),
        once: false,
      });
    });

    const filesToPlace: PolishedFile[] = [];
    const filesToRemove: CoatLockfileContinuousFileEntryStrict[] = [
      {
        path: "folder-1/a.json",
        once: false,
        hash: getFileHash(JSON.stringify({ a: true })),
      },
      {
        path: "folder-1/b.json",
        once: false,
        hash: getFileHash(JSON.stringify({ b: true })),
      },
    ];
    const currentFiles = await getCurrentFilesForTest(
      context,
      filesToPlace,
      filesToRemove
    );
    await updateFilesOnDisk(filesToPlace, filesToRemove, currentFiles, context);

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const logMessage = consoleLogSpy.mock.calls[0][0];
    expect(stripAnsi(logMessage)).toMatchInlineSnapshot(`
      "
        DELETED  folder-1/a.json
        DELETED  folder-1/b.json
      "
    `);

    await expect(() =>
      fs.readFile(path.join(testCwd, "folder-1", "a.json"), "utf-8")
    ).rejects.toHaveProperty(
      "message",
      expect.stringMatching(/ENOENT: no such file or directory, open '.*a.json/)
    );

    await expect(() =>
      fs.readFile(path.join(testCwd, "folder-1", "b.json"), "utf-8")
    ).rejects.toHaveProperty(
      "message",
      expect.stringMatching(/ENOENT: no such file or directory, open '.*b.json/)
    );
  });

  test("should not delete files that will be placed in the same run", async () => {
    // Place file that should be deleted / updated since it switches from "local" to "global"
    await Promise.all([
      fs.outputFile(
        path.join(testCwd, "folder-1", "a.json"),
        JSON.stringify({ a: "local" })
      ),
    ]);
    const context: CoatContext = produce(testContext, (newContext) => {
      newContext.coatLocalLockfile.files.push({
        path: "folder-1/a.json",
        hash: getFileHash(JSON.stringify({ a: "local" })),
        once: false,
        local: true,
      });
    });

    const filesToPlace: PolishedFile[] = [
      {
        file: path.join(testCwd, "folder-1", "a.json"),
        content: JSON.stringify({ a: "global" }),
        hash: JSON.stringify({ a: "global" }),
        type: CoatManifestFileType.Json,
        local: false,
        once: false,
        relativePath: "folder-1/a.json",
      },
    ];
    const filesToRemove: CoatLockfileContinuousFileEntryStrict[] = [
      {
        path: "folder-1/a.json",
        once: false,
        hash: getFileHash(JSON.stringify({ a: "local" })),
      },
    ];
    const currentFiles = await getCurrentFilesForTest(
      context,
      filesToPlace,
      filesToRemove
    );
    await updateFilesOnDisk(filesToPlace, filesToRemove, currentFiles, context);

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const logMessage = consoleLogSpy.mock.calls[0][0];
    expect(stripAnsi(logMessage)).toMatchInlineSnapshot(`
      "
        UPDATED  folder-1/a.json
      "
    `);

    const [aJsonRaw] = await Promise.all([
      fs.readFile(path.join(testCwd, "folder-1", "a.json"), "utf-8"),
    ]);

    const aJson = JSON.parse(aJsonRaw);

    expect(aJson).toEqual({ a: "global" });
  });

  test("should skip when deleting files and disk content has changed from lockfile entry", async () => {
    // Put files on disk and lockfile
    await Promise.all([
      fs.outputFile(
        path.join(testCwd, "folder-1", "a.json"),
        JSON.stringify({ a: false })
      ),
      fs.outputFile(
        path.join(testCwd, "folder-1", "b.json"),
        JSON.stringify({ b: false })
      ),
    ]);
    const context: CoatContext = produce(testContext, (newContext) => {
      newContext.coatGlobalLockfile.files.push({
        path: "folder-1/a.json",
        hash: getFileHash(JSON.stringify({ a: true })),
        once: false,
      });
      newContext.coatLocalLockfile.files.push({
        path: "folder-1/b.json",
        hash: getFileHash(JSON.stringify({ b: true })),
        once: false,
      });
    });

    const filesToPlace: PolishedFile[] = [];
    const filesToRemove: CoatLockfileContinuousFileEntryStrict[] = [
      {
        path: "folder-1/a.json",
        once: false,
        hash: getFileHash(JSON.stringify({ a: true })),
      },
      {
        path: "folder-1/b.json",
        once: false,
        hash: getFileHash(JSON.stringify({ b: true })),
      },
    ];
    const currentFiles = await getCurrentFilesForTest(
      context,
      filesToPlace,
      filesToRemove
    );
    await updateFilesOnDisk(filesToPlace, filesToRemove, currentFiles, context);

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const logMessage = consoleLogSpy.mock.calls[0][0];
    expect(stripAnsi(logMessage)).toMatchInlineSnapshot(`
      "
        DELETED  (skipped - folder-1/a.json)
        DELETED  (skipped - folder-1/b.json)
      "
    `);

    const [aJsonRaw, bJsonRaw] = await Promise.all([
      fs.readFile(path.join(testCwd, "folder-1", "a.json"), "utf-8"),
      fs.readFile(path.join(testCwd, "folder-1", "b.json"), "utf-8"),
    ]);

    const aJson = JSON.parse(aJsonRaw);
    const bJson = JSON.parse(bJsonRaw);

    expect(aJson).toEqual({ a: false });
    expect(bJson).toEqual({ b: false });
  });

  test("should not prompt if package.json is updated", async () => {
    // Put modified package.json on disk
    await Promise.all([
      fs.outputFile(
        path.join(testCwd, PACKAGE_JSON_FILENAME),
        JSON.stringify({ a: "modified" })
      ),
    ]);

    const filesToPlace: PolishedFile[] = [
      {
        file: path.join(testCwd, PACKAGE_JSON_FILENAME),
        type: CoatManifestFileType.Json,
        relativePath: PACKAGE_JSON_FILENAME,
        content: JSON.stringify({ a: "updated" }),
        hash: getFileHash(JSON.stringify({ a: "updated" })),
        local: false,
        once: false,
      },
    ];

    const currentFiles = await getCurrentFilesForTest(
      testContext,
      filesToPlace,
      []
    );
    await updateFilesOnDisk(filesToPlace, [], currentFiles, testContext);

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const consoleMessage = stripAnsi(consoleLogSpy.mock.calls[0][0]);
    expect(consoleMessage).toMatchInlineSnapshot(`
      "
        UPDATED  package.json
      "
    `);

    const [packageJsonRaw] = await Promise.all([
      fs.readFile(path.join(testCwd, PACKAGE_JSON_FILENAME), "utf-8"),
    ]);

    const packageJson = JSON.parse(packageJsonRaw);

    expect(packageJson).toEqual({ a: "updated" });
  });

  describe("prompts", () => {
    test("should exit program if user aborts the prompt", async () => {
      // Put continuous files on disk
      await Promise.all([
        fs.outputFile(
          path.join(testCwd, "folder-1", "a.json"),
          JSON.stringify({ a: false })
        ),
      ]);

      const filesToPlace: PolishedFile[] = [
        {
          file: path.join(testCwd, "folder-1", "a.json"),
          type: CoatManifestFileType.Json,
          relativePath: "folder-1/a.json",
          content: JSON.stringify({ a: true }),
          hash: getFileHash(JSON.stringify({ a: true })),
          local: false,
          once: false,
        },
      ];

      const currentFiles = await getCurrentFilesForTest(
        testContext,
        filesToPlace,
        []
      );

      // Mark user prompt to continue
      promptsMock.mockReturnValue({
        filesToPlacePrompted: false,
      });

      await expect(() =>
        updateFilesOnDisk(filesToPlace, [], currentFiles, testContext)
      ).rejects.toHaveProperty("message", "process.exit");

      expect(promptsMock).toHaveBeenCalledTimes(1);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenLastCalledWith(
        "Aborting coat sync due to user request."
      );

      expect(exitSpy).toHaveBeenCalledTimes(1);
      expect(exitSpy).toHaveBeenLastCalledWith(1);

      const [aJsonRaw] = await Promise.all([
        fs.readFile(path.join(testCwd, "folder-1", "a.json"), "utf-8"),
      ]);

      const aJson = JSON.parse(aJsonRaw);

      expect(aJson).toMatchInlineSnapshot(`
          Object {
            "a": false,
          }
      `);
    });

    test("should prompt when updating a single continuous file for the first time and it already exists with different content", async () => {
      // Put continuous files on disk
      await Promise.all([
        fs.outputFile(
          path.join(testCwd, "folder-1", "a.json"),
          JSON.stringify({ a: false })
        ),
      ]);

      const filesToPlace: PolishedFile[] = [
        {
          file: path.join(testCwd, "folder-1", "a.json"),
          type: CoatManifestFileType.Json,
          relativePath: "folder-1/a.json",
          content: JSON.stringify({ a: true }),
          hash: getFileHash(JSON.stringify({ a: true })),
          local: false,
          once: false,
        },
      ];

      const currentFiles = await getCurrentFilesForTest(
        testContext,
        filesToPlace,
        []
      );

      // Mark user prompt to continue
      promptsMock.mockReturnValue({
        filesToPlacePrompted: true,
      });

      await updateFilesOnDisk(filesToPlace, [], currentFiles, testContext);

      expect(promptsMock).toHaveBeenCalledTimes(1);
      expect(promptsMock).toHaveBeenLastCalledWith({
        name: "filesToPlacePrompted",
        type: "confirm",
        message: "Continue with overwriting this file?",
        default: false,
      });

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      const promptMessage = consoleLogSpy.mock.calls[0][0];
      expect(stripAnsi(promptMessage)).toMatchInlineSnapshot(`
        "The following file already exist in your project and will be overwritten and managed by coat from now:

        folder-1/a.json

        This file will be overwritten each time coat sync is run. You can customize it by placing a a.json-custom.js file next to it.
        "
      `);

      const fileLogMessage = consoleLogSpy.mock.calls[1][0];
      expect(stripAnsi(fileLogMessage)).toMatchInlineSnapshot(`
              "
                UPDATED  folder-1/a.json
              "
          `);

      const [aJsonRaw] = await Promise.all([
        fs.readFile(path.join(testCwd, "folder-1", "a.json"), "utf-8"),
      ]);

      const aJson = JSON.parse(aJsonRaw);

      expect(aJson).toMatchInlineSnapshot(`
          Object {
            "a": true,
          }
      `);
    });

    test("should prompt when updating multiple continuous files for the first time and they already exist with different content", async () => {
      // Put continuous files on disk
      await Promise.all([
        fs.outputFile(
          path.join(testCwd, "folder-1", "a.json"),
          JSON.stringify({ a: false })
        ),
        fs.outputFile(
          path.join(testCwd, "folder-1", "b.json"),
          JSON.stringify({ b: false })
        ),
      ]);

      const filesToPlace: PolishedFile[] = [
        {
          file: path.join(testCwd, "folder-1", "a.json"),
          type: CoatManifestFileType.Json,
          relativePath: "folder-1/a.json",
          content: JSON.stringify({ a: true }),
          hash: getFileHash(JSON.stringify({ a: true })),
          local: false,
          once: false,
        },
        {
          file: path.join(testCwd, "folder-1", "b.json"),
          type: CoatManifestFileType.Json,
          relativePath: "folder-1/b.json",
          content: JSON.stringify({ b: true }),
          hash: getFileHash(JSON.stringify({ b: true })),
          local: true,
          once: false,
        },
      ];

      const currentFiles = await getCurrentFilesForTest(
        testContext,
        filesToPlace,
        []
      );

      // Mark user prompt to continue
      promptsMock.mockReturnValue({
        filesToPlacePrompted: true,
      });

      await updateFilesOnDisk(filesToPlace, [], currentFiles, testContext);

      expect(promptsMock).toHaveBeenCalledTimes(1);
      expect(promptsMock).toHaveBeenLastCalledWith({
        name: "filesToPlacePrompted",
        type: "confirm",
        message: "Continue with overwriting these files?",
        default: false,
      });

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      const promptLogMessage = consoleLogSpy.mock.calls[0][0];
      expect(stripAnsi(promptLogMessage)).toMatchInlineSnapshot(`
        "The following files already exist in your project and will be overwritten and managed by coat from now:

        folder-1/a.json
        folder-1/b.json

        These files will be overwritten each time coat sync is run. You can customize them by placing a <filename>-custom.js file next to them.
        "
      `);

      const fileLogMessage = consoleLogSpy.mock.calls[1][0];
      expect(stripAnsi(fileLogMessage)).toMatchInlineSnapshot(`
              "
                UPDATED  folder-1/a.json
                UPDATED  folder-1/b.json
              "
          `);

      const [aJsonRaw, bJsonRaw] = await Promise.all([
        fs.readFile(path.join(testCwd, "folder-1", "a.json"), "utf-8"),
        fs.readFile(path.join(testCwd, "folder-1", "b.json"), "utf-8"),
      ]);

      const aJson = JSON.parse(aJsonRaw);
      const bJson = JSON.parse(bJsonRaw);

      expect(aJson).toMatchInlineSnapshot(`
          Object {
            "a": true,
          }
      `);

      expect(bJson).toMatchInlineSnapshot(`
          Object {
            "b": true,
          }
      `);
    });

    test("should prompt when updating a single continuous file but its disk content has been modified", async () => {
      // Put continuous file on disk
      await Promise.all([
        fs.outputFile(
          path.join(testCwd, "folder-1", "a.json"),
          JSON.stringify({ a: false })
        ),
      ]);

      const filesToPlace: PolishedFile[] = [
        {
          file: path.join(testCwd, "folder-1", "a.json"),
          type: CoatManifestFileType.Json,
          relativePath: "folder-1/a.json",
          content: JSON.stringify({ a: true }),
          hash: getFileHash(JSON.stringify({ a: true })),
          local: false,
          once: false,
        },
      ];

      const context = produce(testContext, (newContext) => {
        newContext.coatGlobalLockfile.files.push({
          path: filesToPlace[0].relativePath,
          once: false,
          hash: getFileHash(JSON.stringify({ a: true })),
        });
        // Add irrelevant lockfile entry to test whether it impacts the function
        newContext.coatLocalLockfile.files.push({
          type: CoatManifestFileType.Json,
          path: "folder-2/any.json",
          once: true,
        });
      });

      const currentFiles = await getCurrentFilesForTest(
        context,
        filesToPlace,
        []
      );

      // Mark user prompt to continue
      promptsMock.mockReturnValue({
        filesToPlacePrompted: true,
      });

      await updateFilesOnDisk(filesToPlace, [], currentFiles, context);

      expect(promptsMock).toHaveBeenCalledTimes(1);
      expect(promptsMock).toHaveBeenLastCalledWith({
        name: "filesToPlacePrompted",
        type: "confirm",
        message: "Continue with overwriting this file?",
        default: false,
      });

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      const promptLogMessage = consoleLogSpy.mock.calls[0][0];
      expect(stripAnsi(promptLogMessage)).toMatchInlineSnapshot(`
        "The contents of the following file have changed:

        folder-1/a.json

        This file is managed by coat and will be overwritten each time coat sync is run.

        You can customize it by placing a a.json-custom.js file next to it.
        "
      `);

      const fileLogMessage = consoleLogSpy.mock.calls[1][0];
      expect(stripAnsi(fileLogMessage)).toMatchInlineSnapshot(`
            "
              UPDATED  folder-1/a.json
            "
        `);

      const [aJsonRaw] = await Promise.all([
        fs.readFile(path.join(testCwd, "folder-1", "a.json"), "utf-8"),
      ]);

      const aJson = JSON.parse(aJsonRaw);

      expect(aJson).toMatchInlineSnapshot(`
        Object {
          "a": true,
        }
    `);
    });

    test("should prompt when updating multiple continuous files but their disk content has been modified", async () => {
      // Put continuous files on disk
      await Promise.all([
        fs.outputFile(
          path.join(testCwd, "folder-1", "a.json"),
          JSON.stringify({ a: false })
        ),
        fs.outputFile(
          path.join(testCwd, "folder-1", "b.json"),
          JSON.stringify({ b: false })
        ),
      ]);

      const filesToPlace: PolishedFile[] = [
        {
          file: path.join(testCwd, "folder-1", "a.json"),
          type: CoatManifestFileType.Json,
          relativePath: "folder-1/a.json",
          content: JSON.stringify({ a: true }),
          hash: getFileHash(JSON.stringify({ a: true })),
          local: false,
          once: false,
        },
        {
          file: path.join(testCwd, "folder-1", "b.json"),
          type: CoatManifestFileType.Json,
          relativePath: "folder-1/b.json",
          content: JSON.stringify({ b: true }),
          hash: getFileHash(JSON.stringify({ b: true })),
          local: true,
          once: false,
        },
      ];

      const context = produce(testContext, (newContext) => {
        newContext.coatGlobalLockfile.files.push({
          path: filesToPlace[0].relativePath,
          once: false,
          hash: getFileHash(JSON.stringify({ a: true })),
        });
        newContext.coatGlobalLockfile.files.push({
          path: filesToPlace[1].relativePath,
          once: false,
          hash: getFileHash(JSON.stringify({ b: true })),
        });
      });

      const currentFiles = await getCurrentFilesForTest(
        context,
        filesToPlace,
        []
      );

      // Mark user prompt to continue
      promptsMock.mockReturnValue({
        filesToPlacePrompted: true,
      });

      await updateFilesOnDisk(filesToPlace, [], currentFiles, context);

      expect(promptsMock).toHaveBeenCalledTimes(1);
      expect(promptsMock).toHaveBeenLastCalledWith({
        name: "filesToPlacePrompted",
        type: "confirm",
        message: "Continue with overwriting these files?",
        default: false,
      });

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      const promptLogMessage = consoleLogSpy.mock.calls[0][0];
      expect(stripAnsi(promptLogMessage)).toMatchInlineSnapshot(`
        "The contents of the following files have changed:

        folder-1/a.json
        folder-1/b.json

        These files are managed by coat and will be overwritten each time coat sync is run.

        You can customize them by placing a <filename>-custom.js file next to them.
        "
      `);

      const fileLogMessage = consoleLogSpy.mock.calls[1][0];
      expect(stripAnsi(fileLogMessage)).toMatchInlineSnapshot(`
        "
          UPDATED  folder-1/a.json
          UPDATED  folder-1/b.json
        "
      `);

      const [aJsonRaw, bJsonRaw] = await Promise.all([
        fs.readFile(path.join(testCwd, "folder-1", "a.json"), "utf-8"),
        fs.readFile(path.join(testCwd, "folder-1", "b.json"), "utf-8"),
      ]);

      const aJson = JSON.parse(aJsonRaw);
      const bJson = JSON.parse(bJsonRaw);

      expect(aJson).toMatchInlineSnapshot(`
        Object {
          "a": true,
        }
      `);

      expect(bJson).toMatchInlineSnapshot(`
        Object {
          "b": true,
        }
      `);
    });

    test("should prompt when there are continuous files that are both updated for the first time and others that have been updated before - single first time | single already managed", async () => {
      // Put files on disk
      await Promise.all([
        fs.outputFile(
          path.join(testCwd, "folder-1", "a.json"),
          JSON.stringify({ a: false })
        ),
        fs.outputFile(
          path.join(testCwd, "folder-1", "b.json"),
          JSON.stringify({ b: false })
        ),
      ]);

      const filesToPlace: PolishedFile[] = [
        {
          file: path.join(testCwd, "folder-1", "a.json"),
          type: CoatManifestFileType.Json,
          relativePath: "folder-1/a.json",
          content: JSON.stringify({ a: true }),
          hash: getFileHash(JSON.stringify({ a: true })),
          local: false,
          once: false,
        },
        {
          file: path.join(testCwd, "folder-1", "b.json"),
          type: CoatManifestFileType.Json,
          relativePath: "folder-1/b.json",
          content: JSON.stringify({ b: true }),
          hash: getFileHash(JSON.stringify({ b: true })),
          local: true,
          once: false,
        },
      ];

      const context = produce(testContext, (newContext) => {
        newContext.coatGlobalLockfile.files.push({
          path: filesToPlace[0].relativePath,
          once: false,
          hash: getFileHash(JSON.stringify({ a: true })),
        });
      });

      const currentFiles = await getCurrentFilesForTest(
        context,
        filesToPlace,
        []
      );

      // Mark user prompt to continue
      promptsMock.mockReturnValue({
        filesToPlacePrompted: true,
      });

      await updateFilesOnDisk(filesToPlace, [], currentFiles, context);

      expect(promptsMock).toHaveBeenCalledTimes(1);
      expect(promptsMock).toHaveBeenLastCalledWith({
        name: "filesToPlacePrompted",
        type: "confirm",
        message: "Continue with overwriting these files?",
        default: false,
      });

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      const promptLogMessage = consoleLogSpy.mock.calls[0][0];
      expect(stripAnsi(promptLogMessage)).toMatchInlineSnapshot(`
        "The following file already exist in your project and will be overwritten and managed by coat from now:

        folder-1/b.json

        In addition, the contents of the following file have changed:

        folder-1/a.json

        This file was already managed by coat and will be overwritten each time coat sync is run.

        You can customize files by placing a <filename>-custom.js file next to them.
        "
      `);

      const fileLogMessage = consoleLogSpy.mock.calls[1][0];
      expect(stripAnsi(fileLogMessage)).toMatchInlineSnapshot(`
        "
          UPDATED  folder-1/a.json
          UPDATED  folder-1/b.json
        "
      `);

      const [aJsonRaw, bJsonRaw] = await Promise.all([
        fs.readFile(path.join(testCwd, "folder-1", "a.json"), "utf-8"),
        fs.readFile(path.join(testCwd, "folder-1", "b.json"), "utf-8"),
      ]);

      const aJson = JSON.parse(aJsonRaw);
      const bJson = JSON.parse(bJsonRaw);

      expect(aJson).toMatchInlineSnapshot(`
        Object {
          "a": true,
        }
      `);

      expect(bJson).toMatchInlineSnapshot(`
        Object {
          "b": true,
        }
      `);
    });

    test("should prompt when there are continuous files that are both updated for the first time and others that have been updated before - multiple first time | single already managed", async () => {
      // Put files on disk
      await Promise.all([
        fs.outputFile(
          path.join(testCwd, "folder-1", "a.json"),
          JSON.stringify({ a: false })
        ),
        fs.outputFile(
          path.join(testCwd, "folder-1", "b.json"),
          JSON.stringify({ b: false })
        ),
        fs.outputFile(
          path.join(testCwd, "folder-1", "c.json"),
          JSON.stringify({ c: false })
        ),
      ]);

      const filesToPlace: PolishedFile[] = [
        {
          file: path.join(testCwd, "folder-1", "a.json"),
          type: CoatManifestFileType.Json,
          relativePath: "folder-1/a.json",
          content: JSON.stringify({ a: true }),
          hash: getFileHash(JSON.stringify({ a: true })),
          local: false,
          once: false,
        },
        {
          file: path.join(testCwd, "folder-1", "b.json"),
          type: CoatManifestFileType.Json,
          relativePath: "folder-1/b.json",
          content: JSON.stringify({ b: true }),
          hash: getFileHash(JSON.stringify({ b: true })),
          local: true,
          once: false,
        },
        {
          file: path.join(testCwd, "folder-1", "c.json"),
          type: CoatManifestFileType.Json,
          relativePath: "folder-1/c.json",
          content: JSON.stringify({ c: true }),
          hash: getFileHash(JSON.stringify({ c: true })),
          local: false,
          once: false,
        },
      ];

      const context = produce(testContext, (newContext) => {
        newContext.coatGlobalLockfile.files.push({
          path: filesToPlace[0].relativePath,
          once: false,
          hash: getFileHash(JSON.stringify({ a: true })),
        });
      });

      const currentFiles = await getCurrentFilesForTest(
        context,
        filesToPlace,
        []
      );

      // Mark user prompt to continue
      promptsMock.mockReturnValue({
        filesToPlacePrompted: true,
      });

      await updateFilesOnDisk(filesToPlace, [], currentFiles, context);

      expect(promptsMock).toHaveBeenCalledTimes(1);
      expect(promptsMock).toHaveBeenLastCalledWith({
        name: "filesToPlacePrompted",
        type: "confirm",
        message: "Continue with overwriting these files?",
        default: false,
      });

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      const promptLogMessage = consoleLogSpy.mock.calls[0][0];
      expect(stripAnsi(promptLogMessage)).toMatchInlineSnapshot(`
        "The following files already exist in your project and will be overwritten and managed by coat from now:

        folder-1/b.json
        folder-1/c.json

        In addition, the contents of the following file have changed:

        folder-1/a.json

        This file was already managed by coat and will be overwritten each time coat sync is run.

        You can customize files by placing a <filename>-custom.js file next to them.
        "
      `);

      const fileLogMessage = consoleLogSpy.mock.calls[1][0];
      expect(stripAnsi(fileLogMessage)).toMatchInlineSnapshot(`
        "
          UPDATED  folder-1/a.json
          UPDATED  folder-1/b.json
          UPDATED  folder-1/c.json
        "
      `);

      const [aJsonRaw, bJsonRaw, cJsonRaw] = await Promise.all([
        fs.readFile(path.join(testCwd, "folder-1", "a.json"), "utf-8"),
        fs.readFile(path.join(testCwd, "folder-1", "b.json"), "utf-8"),
        fs.readFile(path.join(testCwd, "folder-1", "c.json"), "utf-8"),
      ]);

      const aJson = JSON.parse(aJsonRaw);
      const bJson = JSON.parse(bJsonRaw);
      const cJson = JSON.parse(cJsonRaw);

      expect(aJson).toMatchInlineSnapshot(`
        Object {
          "a": true,
        }
      `);

      expect(bJson).toMatchInlineSnapshot(`
        Object {
          "b": true,
        }
      `);

      expect(cJson).toMatchInlineSnapshot(`
        Object {
          "c": true,
        }
      `);
    });

    test("should prompt when there are continuous files that are both updated for the first time and others that have been updated before - single first time | multiple already managed", async () => {
      // Put files on disk
      await Promise.all([
        fs.outputFile(
          path.join(testCwd, "folder-1", "a.json"),
          JSON.stringify({ a: false })
        ),
        fs.outputFile(
          path.join(testCwd, "folder-1", "b.json"),
          JSON.stringify({ b: false })
        ),
        fs.outputFile(
          path.join(testCwd, "folder-1", "c.json"),
          JSON.stringify({ c: false })
        ),
      ]);

      const filesToPlace: PolishedFile[] = [
        {
          file: path.join(testCwd, "folder-1", "a.json"),
          type: CoatManifestFileType.Json,
          relativePath: "folder-1/a.json",
          content: JSON.stringify({ a: true }),
          hash: getFileHash(JSON.stringify({ a: true })),
          local: false,
          once: false,
        },
        {
          file: path.join(testCwd, "folder-1", "b.json"),
          type: CoatManifestFileType.Json,
          relativePath: "folder-1/b.json",
          content: JSON.stringify({ b: true }),
          hash: getFileHash(JSON.stringify({ b: true })),
          local: true,
          once: false,
        },
        {
          file: path.join(testCwd, "folder-1", "c.json"),
          type: CoatManifestFileType.Json,
          relativePath: "folder-1/c.json",
          content: JSON.stringify({ c: true }),
          hash: getFileHash(JSON.stringify({ c: true })),
          local: false,
          once: false,
        },
      ];

      const context = produce(testContext, (newContext) => {
        newContext.coatGlobalLockfile.files.push({
          path: filesToPlace[0].relativePath,
          once: false,
          hash: getFileHash(JSON.stringify({ a: true })),
        });
        newContext.coatLocalLockfile.files.push({
          path: filesToPlace[1].relativePath,
          once: false,
          hash: getFileHash(JSON.stringify({ b: true })),
        });
      });

      const currentFiles = await getCurrentFilesForTest(
        context,
        filesToPlace,
        []
      );

      // Mark user prompt to continue
      promptsMock.mockReturnValue({
        filesToPlacePrompted: true,
      });

      await updateFilesOnDisk(filesToPlace, [], currentFiles, context);

      expect(promptsMock).toHaveBeenCalledTimes(1);
      expect(promptsMock).toHaveBeenLastCalledWith({
        name: "filesToPlacePrompted",
        type: "confirm",
        message: "Continue with overwriting these files?",
        default: false,
      });

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      const promptLogMessage = consoleLogSpy.mock.calls[0][0];
      expect(stripAnsi(promptLogMessage)).toMatchInlineSnapshot(`
        "The following file already exist in your project and will be overwritten and managed by coat from now:

        folder-1/c.json

        In addition, the contents of the following files have changed:

        folder-1/a.json
        folder-1/b.json

        These files were already managed by coat and will be overwritten each time coat sync is run.

        You can customize files by placing a <filename>-custom.js file next to them.
        "
      `);

      const fileLogMessage = consoleLogSpy.mock.calls[1][0];
      expect(stripAnsi(fileLogMessage)).toMatchInlineSnapshot(`
        "
          UPDATED  folder-1/a.json
          UPDATED  folder-1/b.json
          UPDATED  folder-1/c.json
        "
      `);

      const [aJsonRaw, bJsonRaw, cJsonRaw] = await Promise.all([
        fs.readFile(path.join(testCwd, "folder-1", "a.json"), "utf-8"),
        fs.readFile(path.join(testCwd, "folder-1", "b.json"), "utf-8"),
        fs.readFile(path.join(testCwd, "folder-1", "c.json"), "utf-8"),
      ]);

      const aJson = JSON.parse(aJsonRaw);
      const bJson = JSON.parse(bJsonRaw);
      const cJson = JSON.parse(cJsonRaw);

      expect(aJson).toMatchInlineSnapshot(`
        Object {
          "a": true,
        }
      `);

      expect(bJson).toMatchInlineSnapshot(`
        Object {
          "b": true,
        }
      `);

      expect(cJson).toMatchInlineSnapshot(`
        Object {
          "c": true,
        }
      `);
    });

    test("should prompt when there are continuous files that are both updated for the first time and others that have been updated before - multiple first time | multiple already managed", async () => {
      // Put files on disk
      await Promise.all([
        fs.outputFile(
          path.join(testCwd, "folder-1", "a.json"),
          JSON.stringify({ a: false })
        ),
        fs.outputFile(
          path.join(testCwd, "folder-1", "b.json"),
          JSON.stringify({ b: false })
        ),
        fs.outputFile(
          path.join(testCwd, "folder-1", "c.json"),
          JSON.stringify({ c: false })
        ),
        fs.outputFile(
          path.join(testCwd, "folder-1", "d.json"),
          JSON.stringify({ d: false })
        ),
      ]);

      const filesToPlace: PolishedFile[] = [
        {
          file: path.join(testCwd, "folder-1", "a.json"),
          type: CoatManifestFileType.Json,
          relativePath: "folder-1/a.json",
          content: JSON.stringify({ a: true }),
          hash: getFileHash(JSON.stringify({ a: true })),
          local: false,
          once: false,
        },
        {
          file: path.join(testCwd, "folder-1", "b.json"),
          type: CoatManifestFileType.Json,
          relativePath: "folder-1/b.json",
          content: JSON.stringify({ b: true }),
          hash: getFileHash(JSON.stringify({ b: true })),
          local: true,
          once: false,
        },
        {
          file: path.join(testCwd, "folder-1", "d.json"),
          type: CoatManifestFileType.Json,
          relativePath: "folder-1/d.json",
          content: JSON.stringify({ d: true }),
          hash: getFileHash(JSON.stringify({ d: true })),
          local: true,
          once: false,
        },
        {
          file: path.join(testCwd, "folder-1", "c.json"),
          type: CoatManifestFileType.Json,
          relativePath: "folder-1/c.json",
          content: JSON.stringify({ c: true }),
          hash: getFileHash(JSON.stringify({ c: true })),
          local: false,
          once: false,
        },
      ];

      const context = produce(testContext, (newContext) => {
        newContext.coatGlobalLockfile.files.push({
          path: filesToPlace[0].relativePath,
          once: false,
          hash: getFileHash(JSON.stringify({ a: true })),
        });
        newContext.coatLocalLockfile.files.push({
          path: filesToPlace[1].relativePath,
          once: false,
          hash: getFileHash(JSON.stringify({ b: true })),
        });
      });

      const currentFiles = await getCurrentFilesForTest(
        context,
        filesToPlace,
        []
      );

      // Mark user prompt to continue
      promptsMock.mockReturnValue({
        filesToPlacePrompted: true,
      });

      await updateFilesOnDisk(filesToPlace, [], currentFiles, context);

      expect(promptsMock).toHaveBeenCalledTimes(1);
      expect(promptsMock).toHaveBeenLastCalledWith({
        name: "filesToPlacePrompted",
        type: "confirm",
        message: "Continue with overwriting these files?",
        default: false,
      });

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      const promptLogMessage = consoleLogSpy.mock.calls[0][0];
      expect(stripAnsi(promptLogMessage)).toMatchInlineSnapshot(`
        "The following files already exist in your project and will be overwritten and managed by coat from now:

        folder-1/c.json
        folder-1/d.json

        In addition, the contents of the following files have changed:

        folder-1/a.json
        folder-1/b.json

        These files were already managed by coat and will be overwritten each time coat sync is run.

        You can customize files by placing a <filename>-custom.js file next to them.
        "
      `);

      const fileLogMessage = consoleLogSpy.mock.calls[1][0];
      expect(stripAnsi(fileLogMessage)).toMatchInlineSnapshot(`
        "
          UPDATED  folder-1/a.json
          UPDATED  folder-1/b.json
          UPDATED  folder-1/c.json
          UPDATED  folder-1/d.json
        "
      `);

      const [aJsonRaw, bJsonRaw, cJsonRaw, dJsonRaw] = await Promise.all([
        fs.readFile(path.join(testCwd, "folder-1", "a.json"), "utf-8"),
        fs.readFile(path.join(testCwd, "folder-1", "b.json"), "utf-8"),
        fs.readFile(path.join(testCwd, "folder-1", "c.json"), "utf-8"),
        fs.readFile(path.join(testCwd, "folder-1", "d.json"), "utf-8"),
      ]);

      const aJson = JSON.parse(aJsonRaw);
      const bJson = JSON.parse(bJsonRaw);
      const cJson = JSON.parse(cJsonRaw);
      const dJson = JSON.parse(dJsonRaw);

      expect(aJson).toMatchInlineSnapshot(`
        Object {
          "a": true,
        }
      `);

      expect(bJson).toMatchInlineSnapshot(`
        Object {
          "b": true,
        }
      `);

      expect(cJson).toMatchInlineSnapshot(`
        Object {
          "c": true,
        }
      `);

      expect(dJson).toMatchInlineSnapshot(`
        Object {
          "d": true,
        }
      `);
    });
  });
});
