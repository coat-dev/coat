import fs from "fs-extra";
import path from "path";
import { vol } from "memfs";
import { getNormalizedFilePath } from "../util/get-normalized-file-path";
import {
  FileOperation,
  FileOperationType,
  UpdatePrompt,
} from "./get-file-operations";
import { performFileOperations } from "./perform-file-operations";
import { CoatContext } from "../types/coat-context";
import { getStrictCoatManifest } from "../util/get-strict-coat-manifest";
import {
  getStrictCoatGlobalLockfile,
  getStrictCoatLocalLockfile,
} from "../lockfiles/get-strict-coat-lockfiles";
import {
  COAT_GLOBAL_LOCKFILE_VERSION,
  COAT_LOCAL_LOCKFILE_VERSION,
} from "../constants";
import { createFileOperationLogMessage } from "./create-file-operation-log-message";

jest.mock("fs").mock("./create-file-operation-log-message");

const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {
  // Empty function
});

(createFileOperationLogMessage as unknown as jest.Mock).mockImplementation(
  (file: FileOperation) => `${file.type} - ${file.relativePath}`
);

describe("sync/perform-file-operations", () => {
  afterEach(() => {
    vol.reset();
    jest.clearAllMocks();
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

  test("should work with any empty array", async () => {
    await performFileOperations([]);
  });

  test("should log up to date message if no operation needs to be performed", async () => {
    await performFileOperations([]);

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy).toHaveBeenLastCalledWith(
      "\n♻️ Everything up to date\n"
    );
  });

  test("should output files to disk", async () => {
    const fileOperations: FileOperation[] = [
      {
        type: FileOperationType.Place,
        absolutePath: getNormalizedFilePath("folder-1/a.json", testContext),
        relativePath: "folder-1/a.json",
        content: JSON.stringify({ a: false }),
        local: false,
      },
      {
        type: FileOperationType.UpdateWithPrompt,
        prompt: UpdatePrompt.Update,
        absolutePath: getNormalizedFilePath("folder-1/b.json", testContext),
        relativePath: "folder-1/b.json",
        content: JSON.stringify({ b: false }),
        local: false,
      },
      {
        type: FileOperationType.Update,
        absolutePath: getNormalizedFilePath("folder-1/c.json", testContext),
        relativePath: "folder-1/c.json",
        content: JSON.stringify({ c: false }),
        local: false,
      },
    ];

    await performFileOperations(fileOperations);

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy.mock.calls[0][0]).toMatchInlineSnapshot(`
      "
      2 - folder-1/a.json
      4 - folder-1/b.json
      3 - folder-1/c.json
      "
    `);

    const [aRaw, bRaw, cRaw] = await Promise.all([
      fs.readFile(fileOperations[0].absolutePath, "utf-8"),
      fs.readFile(fileOperations[1].absolutePath, "utf-8"),
      fs.readFile(fileOperations[2].absolutePath, "utf-8"),
    ]);

    expect(JSON.parse(aRaw)).toMatchInlineSnapshot(`
      {
        "a": false,
      }
    `);
    expect(JSON.parse(bRaw)).toMatchInlineSnapshot(`
      {
        "b": false,
      }
    `);
    expect(JSON.parse(cRaw)).toMatchInlineSnapshot(`
      {
        "c": false,
      }
    `);
  });

  test("should delete files from disk", async () => {
    const fileOperations: FileOperation[] = [
      {
        type: FileOperationType.Delete,
        absolutePath: getNormalizedFilePath("folder-1/a.json", testContext),
        relativePath: "folder-1/a.json",
        local: false,
      },
    ];
    await fs.outputFile(fileOperations[0].absolutePath, "testContent");

    await performFileOperations(fileOperations);

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy.mock.calls[0][0]).toMatchInlineSnapshot(`
      "
      0 - folder-1/a.json
      "
    `);

    await expect(
      fs.readFile(fileOperations[0].absolutePath)
    ).rejects.toHaveProperty(
      "message",
      expect.stringContaining("ENOENT: no such file or directory")
    );
  });

  test("should not delete file when delete is skipped", async () => {
    const fileOperations: FileOperation[] = [
      {
        type: FileOperationType.DeleteSkipped,
        absolutePath: getNormalizedFilePath("folder-1/a.json", testContext),
        relativePath: "folder-1/a.json",
        local: false,
      },
    ];
    await fs.outputFile(fileOperations[0].absolutePath, "testContent");

    await performFileOperations(fileOperations);

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy.mock.calls[0][0]).toMatchInlineSnapshot(`
      "
      1 - folder-1/a.json
      "
    `);

    await expect(
      fs.readFile(fileOperations[0].absolutePath, "utf-8")
    ).resolves.toBe("testContent");
  });
});
