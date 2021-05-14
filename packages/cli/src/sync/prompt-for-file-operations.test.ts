import path from "path";
import stripAnsi from "strip-ansi";
import { prompt } from "inquirer";
import {
  COAT_GLOBAL_LOCKFILE_VERSION,
  COAT_LOCAL_LOCKFILE_VERSION,
} from "../constants";
import {
  getStrictCoatGlobalLockfile,
  getStrictCoatLocalLockfile,
} from "../lockfiles/get-strict-coat-lockfiles";
import { CoatContext } from "../types/coat-context";
import { getNormalizedFilePath } from "../util/get-normalized-file-path";
import { getStrictCoatManifest } from "../util/get-strict-coat-manifest";
import {
  FileOperation,
  FileOperationType,
  UpdatePrompt,
} from "./get-file-operations";
import { promptForFileOperations } from "./prompt-for-file-operations";

jest.mock("inquirer");

const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {
  // Empty function
});

const promptsMock = prompt as unknown as jest.Mock;
// Default return value for prompts
promptsMock.mockReturnValue({
  filesToPlacePrompted: false,
});

describe("sync/prompt-for-file-operations", () => {
  afterEach(() => {
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

  test("should work and not prompt with empty array", async () => {
    await expect(promptForFileOperations([])).resolves.toBe(true);
  });

  test("should not prompt when prompt operation is required", async () => {
    const fileOperations: FileOperation[] = [
      {
        type: FileOperationType.Delete,
        absolutePath: "/test/file-1",
        relativePath: "file-1",
        local: false,
      },
      {
        type: FileOperationType.DeleteSkipped,
        absolutePath: "/test/file-2",
        relativePath: "file-2",
        local: false,
      },
      {
        type: FileOperationType.Place,
        absolutePath: "/test/file-2",
        relativePath: "file-2",
        content: "test",
        local: false,
      },
      {
        type: FileOperationType.Update,
        absolutePath: "/test/file-2",
        relativePath: "file-2",
        content: "test",
        local: false,
      },
    ];

    await expect(promptForFileOperations(fileOperations)).resolves.toBe(true);
  });

  test("should return false if user is prompted and selects no", async () => {
    const fileOperations: FileOperation[] = [
      {
        type: FileOperationType.UpdateWithPrompt,
        prompt: UpdatePrompt.FirstUpdate,
        absolutePath: getNormalizedFilePath("folder-1/a.json", testContext),
        relativePath: "folder-1/a.json",
        content: JSON.stringify({ a: true }),
        local: false,
      },
    ];

    // Mark user prompt to continue
    promptsMock.mockReturnValue({
      filesToPlacePrompted: false,
    });

    await expect(promptForFileOperations(fileOperations)).resolves.toBe(false);
  });

  test("should prompt when updating a single continuous file for the first time and it already exists with different content", async () => {
    const fileOperations: FileOperation[] = [
      {
        type: FileOperationType.UpdateWithPrompt,
        prompt: UpdatePrompt.FirstUpdate,
        absolutePath: getNormalizedFilePath("folder-1/a.json", testContext),
        relativePath: "folder-1/a.json",
        content: JSON.stringify({ a: true }),
        local: false,
      },
    ];

    // Mark user prompt to continue
    promptsMock.mockReturnValue({
      filesToPlacePrompted: true,
    });

    await expect(promptForFileOperations(fileOperations)).resolves.toBe(true);

    expect(promptsMock).toHaveBeenCalledTimes(1);
    expect(promptsMock).toHaveBeenLastCalledWith({
      name: "filesToPlacePrompted",
      type: "confirm",
      message: "Continue with overwriting this file?",
      default: false,
    });

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const promptMessage = consoleLogSpy.mock.calls[0][0];
    expect(stripAnsi(promptMessage)).toMatchInlineSnapshot(`
      "The following file already exist in your project and will be overwritten and managed by coat from now:

      folder-1/a.json

      This file will be overwritten each time coat sync is run. You can customize it by placing a a.json-custom.js file next to it.
      "
    `);
  });

  test("should prompt when updating multiple continuous files for the first time and they already exist with different content", async () => {
    const fileOperations: FileOperation[] = [
      {
        type: FileOperationType.UpdateWithPrompt,
        prompt: UpdatePrompt.FirstUpdate,
        absolutePath: getNormalizedFilePath("folder-1/a.json", testContext),
        relativePath: "folder-1/a.json",
        content: JSON.stringify({ a: false }),
        local: false,
      },
      {
        type: FileOperationType.UpdateWithPrompt,
        prompt: UpdatePrompt.FirstUpdate,
        absolutePath: getNormalizedFilePath("folder-1/b.json", testContext),
        relativePath: "folder-1/b.json",
        content: JSON.stringify({ b: false }),
        local: false,
      },
    ];

    // Mark user prompt to continue
    promptsMock.mockReturnValue({
      filesToPlacePrompted: true,
    });

    await expect(promptForFileOperations(fileOperations)).resolves.toBe(true);

    expect(promptsMock).toHaveBeenCalledTimes(1);
    expect(promptsMock).toHaveBeenLastCalledWith({
      name: "filesToPlacePrompted",
      type: "confirm",
      message: "Continue with overwriting these files?",
      default: false,
    });

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const promptLogMessage = consoleLogSpy.mock.calls[0][0];
    expect(stripAnsi(promptLogMessage)).toMatchInlineSnapshot(`
      "The following files already exist in your project and will be overwritten and managed by coat from now:

      folder-1/a.json
      folder-1/b.json

      These files will be overwritten each time coat sync is run. You can customize them by placing a <filename>-custom.js file next to them.
      "
    `);
  });

  test("should prompt when updating a single continuous file but its disk content has been modified", async () => {
    const fileOperations: FileOperation[] = [
      {
        type: FileOperationType.UpdateWithPrompt,
        prompt: UpdatePrompt.Update,
        absolutePath: getNormalizedFilePath("folder-1/a.json", testContext),
        relativePath: "folder-1/a.json",
        content: JSON.stringify({ a: false }),
        local: false,
      },
    ];

    // Mark user prompt to continue
    promptsMock.mockReturnValue({
      filesToPlacePrompted: true,
    });

    await expect(promptForFileOperations(fileOperations)).resolves.toBe(true);

    expect(promptsMock).toHaveBeenCalledTimes(1);
    expect(promptsMock).toHaveBeenLastCalledWith({
      name: "filesToPlacePrompted",
      type: "confirm",
      message: "Continue with overwriting this file?",
      default: false,
    });

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const promptLogMessage = consoleLogSpy.mock.calls[0][0];
    expect(stripAnsi(promptLogMessage)).toMatchInlineSnapshot(`
      "The contents of the following file have changed:

      folder-1/a.json

      This file is managed by coat and will be overwritten each time coat sync is run.

      You can customize it by placing a a.json-custom.js file next to it.
      "
    `);
  });

  test("should prompt when updating multiple continuous files but their disk content has been modified", async () => {
    const fileOperations: FileOperation[] = [
      {
        type: FileOperationType.UpdateWithPrompt,
        prompt: UpdatePrompt.Update,
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
    ];

    // Mark user prompt to continue
    promptsMock.mockReturnValue({
      filesToPlacePrompted: true,
    });

    await expect(promptForFileOperations(fileOperations)).resolves.toBe(true);

    expect(promptsMock).toHaveBeenCalledTimes(1);
    expect(promptsMock).toHaveBeenLastCalledWith({
      name: "filesToPlacePrompted",
      type: "confirm",
      message: "Continue with overwriting these files?",
      default: false,
    });

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const promptLogMessage = consoleLogSpy.mock.calls[0][0];
    expect(stripAnsi(promptLogMessage)).toMatchInlineSnapshot(`
      "The contents of the following files have changed:

      folder-1/a.json
      folder-1/b.json

      These files are managed by coat and will be overwritten each time coat sync is run.

      You can customize them by placing a <filename>-custom.js file next to them.
      "
    `);
  });

  test("should prompt when there are continuous files that are both updated for the first time and others that have been updated before - single first time | single already managed", async () => {
    const fileOperations: FileOperation[] = [
      {
        type: FileOperationType.UpdateWithPrompt,
        prompt: UpdatePrompt.Update,
        absolutePath: getNormalizedFilePath("folder-1/a.json", testContext),
        relativePath: "folder-1/a.json",
        content: JSON.stringify({ a: false }),
        local: false,
      },
      {
        type: FileOperationType.UpdateWithPrompt,
        prompt: UpdatePrompt.FirstUpdate,
        absolutePath: getNormalizedFilePath("folder-1/b.json", testContext),
        relativePath: "folder-1/b.json",
        content: JSON.stringify({ b: false }),
        local: false,
      },
    ];

    // Mark user prompt to continue
    promptsMock.mockReturnValue({
      filesToPlacePrompted: true,
    });

    await expect(promptForFileOperations(fileOperations)).resolves.toBe(true);

    expect(promptsMock).toHaveBeenCalledTimes(1);
    expect(promptsMock).toHaveBeenLastCalledWith({
      name: "filesToPlacePrompted",
      type: "confirm",
      message: "Continue with overwriting these files?",
      default: false,
    });

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
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
  });

  test("should prompt when there are continuous files that are both updated for the first time and others that have been updated before - multiple first time | single already managed", async () => {
    const fileOperations: FileOperation[] = [
      {
        type: FileOperationType.UpdateWithPrompt,
        prompt: UpdatePrompt.Update,
        absolutePath: getNormalizedFilePath("folder-1/a.json", testContext),
        relativePath: "folder-1/a.json",
        content: JSON.stringify({ a: false }),
        local: false,
      },
      {
        type: FileOperationType.UpdateWithPrompt,
        prompt: UpdatePrompt.FirstUpdate,
        absolutePath: getNormalizedFilePath("folder-1/b.json", testContext),
        relativePath: "folder-1/b.json",
        content: JSON.stringify({ b: false }),
        local: false,
      },
      {
        type: FileOperationType.UpdateWithPrompt,
        prompt: UpdatePrompt.FirstUpdate,
        absolutePath: getNormalizedFilePath("folder-1/c.json", testContext),
        relativePath: "folder-1/c.json",
        content: JSON.stringify({ c: false }),
        local: false,
      },
    ];

    // Mark user prompt to continue
    promptsMock.mockReturnValue({
      filesToPlacePrompted: true,
    });

    await expect(promptForFileOperations(fileOperations)).resolves.toBe(true);

    expect(promptsMock).toHaveBeenCalledTimes(1);
    expect(promptsMock).toHaveBeenLastCalledWith({
      name: "filesToPlacePrompted",
      type: "confirm",
      message: "Continue with overwriting these files?",
      default: false,
    });

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
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
  });

  test("should prompt when there are continuous files that are both updated for the first time and others that have been updated before - single first time | multiple already managed", async () => {
    const fileOperations: FileOperation[] = [
      {
        type: FileOperationType.UpdateWithPrompt,
        prompt: UpdatePrompt.Update,
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
        type: FileOperationType.UpdateWithPrompt,
        prompt: UpdatePrompt.FirstUpdate,
        absolutePath: getNormalizedFilePath("folder-1/c.json", testContext),
        relativePath: "folder-1/c.json",
        content: JSON.stringify({ c: false }),
        local: false,
      },
    ];

    // Mark user prompt to continue
    promptsMock.mockReturnValue({
      filesToPlacePrompted: true,
    });

    await expect(promptForFileOperations(fileOperations)).resolves.toBe(true);

    expect(promptsMock).toHaveBeenCalledTimes(1);
    expect(promptsMock).toHaveBeenLastCalledWith({
      name: "filesToPlacePrompted",
      type: "confirm",
      message: "Continue with overwriting these files?",
      default: false,
    });

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
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
  });

  test("should prompt when there are continuous files that are both updated for the first time and others that have been updated before - multiple first time | multiple already managed", async () => {
    const fileOperations: FileOperation[] = [
      {
        type: FileOperationType.UpdateWithPrompt,
        prompt: UpdatePrompt.Update,
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
        type: FileOperationType.UpdateWithPrompt,
        prompt: UpdatePrompt.FirstUpdate,
        absolutePath: getNormalizedFilePath("folder-1/c.json", testContext),
        relativePath: "folder-1/c.json",
        content: JSON.stringify({ c: false }),
        local: false,
      },
      {
        type: FileOperationType.UpdateWithPrompt,
        prompt: UpdatePrompt.FirstUpdate,
        absolutePath: getNormalizedFilePath("folder-1/d.json", testContext),
        relativePath: "folder-1/d.json",
        content: JSON.stringify({ d: false }),
        local: false,
      },
    ];

    // Mark user prompt to continue
    promptsMock.mockReturnValue({
      filesToPlacePrompted: true,
    });

    await expect(promptForFileOperations(fileOperations)).resolves.toBe(true);

    expect(promptsMock).toHaveBeenCalledTimes(1);
    expect(promptsMock).toHaveBeenLastCalledWith({
      name: "filesToPlacePrompted",
      type: "confirm",
      message: "Continue with overwriting these files?",
      default: false,
    });

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
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
  });
});
