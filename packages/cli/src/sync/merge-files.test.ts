import fsExtra from "fs-extra";
import fs from "fs";
import path from "path";
import { vol } from "memfs";
import importFrom from "import-from";
import { mergeFiles } from "./merge-files";
import { CoatContext } from "../types/coat-context";
import { getStrictCoatManifest } from "../util/get-strict-coat-manifest";
import { CoatManifestFileType } from "../types/coat-manifest-file";
import {
  getStrictCoatGlobalLockfile,
  getStrictCoatLocalLockfile,
} from "../lockfiles/get-strict-coat-lockfiles";
import {
  COAT_GLOBAL_LOCKFILE_VERSION,
  COAT_LOCAL_LOCKFILE_VERSION,
} from "../constants";
import { groupFiles } from "./group-files";
import { jsonFileFunctions } from "../file-types/json";
import { JsonObject } from "type-fest";

jest.mock("fs").mock("import-from");

const statMock = jest.spyOn(fs.promises, "stat");
const importFromMock = (importFrom as unknown) as jest.Mock;

describe("sync/merge-files", () => {
  afterEach(() => {
    vol.reset();
  });

  const testCwd = "/test-cwd";

  const testContext: CoatContext = {
    cwd: testCwd,
    coatManifest: getStrictCoatManifest({
      name: "hi",
    }),
    packageJson: {},
    coatGlobalLockfile: getStrictCoatGlobalLockfile({
      version: COAT_GLOBAL_LOCKFILE_VERSION,
    }),
    coatLocalLockfile: getStrictCoatLocalLockfile({
      version: COAT_LOCAL_LOCKFILE_VERSION,
    }),
  };

  test("should work with empty object", async () => {
    const result = await mergeFiles({}, testContext);
    expect(result).toEqual([]);
  });

  test("should return single file unchanged with a normalized file path", async () => {
    const files = groupFiles(
      [
        {
          file: "folder-1/../file.json",
          type: CoatManifestFileType.Json,
          content: {
            value: 1,
          },
          local: false,
          once: false,
        },
      ],
      testContext
    );
    const result = await mergeFiles(files, testContext);
    expect(result).toEqual([
      {
        type: CoatManifestFileType.Json,
        file: path.join(testCwd, "file.json"),
        relativePath: "file.json",
        content: {
          value: 1,
        },
        once: false,
        local: false,
      },
    ]);
  });

  test("should not place file if an entry exists with null for it afterwards", async () => {
    const files = groupFiles(
      [
        {
          type: CoatManifestFileType.Json,
          content: {
            value: 1,
          },
          file: "path.json",
        },
        {
          file: "path.json",
          content: null,
          type: CoatManifestFileType.Json,
        },
      ],
      testContext
    );
    const result = await mergeFiles(files, testContext);
    expect(result).toEqual([]);
  });

  test("should place file if an entry exists after a deleted file", async () => {
    const files = groupFiles(
      [
        {
          type: CoatManifestFileType.Json,
          content: {
            value: 1,
          },
          file: "path.json",
        },
        {
          file: "path.json",
          content: null,
          type: CoatManifestFileType.Json,
        },
        {
          file: "path.json",
          content: {
            value2: 3,
          },
          type: CoatManifestFileType.Json,
        },
      ],
      testContext
    );
    const result = await mergeFiles(files, testContext);
    expect(result).toEqual([
      {
        file: path.join("/test-cwd", "path.json"),
        relativePath: "path.json",
        type: CoatManifestFileType.Json,
        content: {
          value2: 3,
        },
        local: false,
        once: false,
      },
    ]);
  });

  test("should call content function with result from previously merged file entries", async () => {
    const file1 = jest.fn<
      JsonObject,
      [JsonObject | null | undefined, typeof jsonFileFunctions.merge]
    >(() => ({
      value1: 1,
    }));
    const file2 = jest.fn<
      JsonObject,
      [JsonObject | null | undefined, typeof jsonFileFunctions.merge]
    >(() => ({
      value2: 2,
    }));
    const file3 = jest.fn<
      JsonObject,
      [JsonObject | null | undefined, typeof jsonFileFunctions.merge]
    >((input) => ({
      ...input,
      value3: 3,
    }));
    const file4 = jest.fn<
      JsonObject | null,
      [JsonObject | null | undefined, typeof jsonFileFunctions.merge]
    >((input, merge) => merge(input, { z: 5 }));
    const files = groupFiles(
      [
        {
          type: CoatManifestFileType.Json,
          content: file1,
          file: "path.json",
        },
        {
          file: "path.json",
          content: file2,
          type: CoatManifestFileType.Json,
        },
        {
          file: "path.json",
          content: file3,
          type: CoatManifestFileType.Json,
        },
        {
          file: "path.json",
          content: file4,
          type: CoatManifestFileType.Json,
        },
      ],
      testContext
    );
    const result = await mergeFiles(files, testContext);

    expect(file1).toHaveBeenCalledTimes(1);
    expect(file2).toHaveBeenCalledTimes(1);
    expect(file3).toHaveBeenCalledTimes(1);

    expect(file1).toHaveBeenCalledWith(undefined, jsonFileFunctions.merge);
    expect(file2).toHaveBeenCalledWith({ value1: 1 }, jsonFileFunctions.merge);
    expect(file3).toHaveBeenCalledWith({ value2: 2 }, jsonFileFunctions.merge);

    expect(result).toEqual([
      {
        file: path.join("/test-cwd", "path.json"),
        relativePath: "path.json",
        type: CoatManifestFileType.Json,
        content: {
          value2: 2,
          value3: 3,
          z: 5,
        },
        local: false,
        once: false,
      },
    ]);
  });

  test("should not place file if last file content function returns null", async () => {
    const file1 = jest.fn<
      JsonObject,
      [JsonObject | null | undefined, typeof jsonFileFunctions.merge]
    >(() => ({
      value1: 1,
    }));
    const file2 = jest.fn<
      JsonObject,
      [JsonObject | null | undefined, typeof jsonFileFunctions.merge]
    >(() => ({
      value2: 2,
    }));
    const file3 = jest.fn<
      null,
      [JsonObject | null | undefined, typeof jsonFileFunctions.merge]
    >(() => null);
    const files = groupFiles(
      [
        {
          type: CoatManifestFileType.Json,
          content: file1,
          file: "path.json",
        },
        {
          file: "path.json",
          content: file2,
          type: CoatManifestFileType.Json,
        },
        {
          file: "path.json",
          content: file3,
          type: CoatManifestFileType.Json,
        },
      ],
      testContext
    );
    const result = await mergeFiles(files, testContext);

    expect(file1).toHaveBeenCalledTimes(1);
    expect(file2).toHaveBeenCalledTimes(1);
    expect(file3).toHaveBeenCalledTimes(1);

    expect(file1).toHaveBeenCalledWith(undefined, jsonFileFunctions.merge);
    expect(file2).toHaveBeenCalledWith({ value1: 1 }, jsonFileFunctions.merge);
    expect(file3).toHaveBeenCalledWith({ value2: 2 }, jsonFileFunctions.merge);

    expect(result).toEqual([]);
  });

  test("should throw an error when trying to merge unknown file types", async () => {
    expect.assertions(1);
    const files = groupFiles(
      [
        {
          // @ts-expect-error
          type: "unknown",
          content: { value: 1 },
          file: "path.yml",
        },
        {
          file: "path.json",
          content: { value2: 2 },
          // @ts-expect-error
          type: "unknown",
        },
      ],
      testContext
    );
    try {
      await mergeFiles(files, testContext);
    } catch (error) {
      expect(error.message).toMatchInlineSnapshot(
        `"Cannot merge unknown file type: unknown"`
      );
    }
  });

  test("should throw error if customization file can't be accessed", async () => {
    expect.assertions(1);
    const files = groupFiles(
      [
        {
          type: CoatManifestFileType.Json,
          content: {
            value: 1,
          },
          file: "file.json",
        },
      ],
      testContext
    );

    statMock.mockImplementationOnce(() => {
      throw new Error("Something went wrong");
    });

    try {
      await mergeFiles(files, testContext);
    } catch (error) {
      expect(error.message).toMatchInlineSnapshot(`"Something went wrong"`);
    }
  });

  test("should not place files if customization file exports null", async () => {
    for (let i = 0; i < 2; i++) {
      // Mock for each placed customization file
      importFromMock.mockImplementationOnce(() => null);
    }

    const files = groupFiles(
      [
        {
          type: CoatManifestFileType.Json,
          content: {
            value: 1,
          },
          file: "file.json",
        },
        {
          type: CoatManifestFileType.Text,
          content: "Hello Test",
          file: "file.txt",
        },
      ],
      testContext
    );
    // Place empty files to trick mergeFiles into believing a customization file exists
    await Promise.all([
      fsExtra.outputFile("/test-cwd/file.json-custom.js", ""),
      fsExtra.outputFile("/test-cwd/file.txt-custom.js", ""),
    ]);

    const result = await mergeFiles(files, testContext);
    expect(result).toEqual([]);
  });

  test("should not apply customization file if file is only generated once", async () => {
    const files = groupFiles(
      [
        {
          type: CoatManifestFileType.Json,
          content: {
            firstValue: 1,
          },
          once: true,
          file: "file.json",
        },
      ],
      testContext
    );
    // Place empty file to trick mergeFiles into believing a customization file exists
    await fsExtra.outputFile("/test-cwd/file.json-custom.js", "");

    const result = await mergeFiles(files, testContext);
    expect(result).toEqual([
      {
        file: path.join(testCwd, "file.json"),
        relativePath: "file.json",
        once: true,
        local: false,
        type: "JSON",
        content: {
          firstValue: 1,
        },
      },
    ]);
  });

  describe("json files", () => {
    test("should merge multiple json files", async () => {
      const files = groupFiles(
        [
          {
            type: CoatManifestFileType.Json,
            content: {
              value: 1,
            },
            file: "file.json",
          },
          {
            type: CoatManifestFileType.Json,
            content: {
              value: 2,
              value2: 1,
              valueIndependent: true,
              valueDeep: {
                a: [1, 2, 3],
              },
            },
            file: "file.json",
          },
          {
            type: CoatManifestFileType.Json,
            content: {
              value: 3,
              value2: 2,
              value3: 1,
              valueDeep: {
                a: [1, 2, 6, 7],
              },
            },
            file: "folder-1/../file.json",
          },
        ],
        testContext
      );
      const result = await mergeFiles(files, testContext);
      expect(result).toEqual([
        {
          type: CoatManifestFileType.Json,
          file: path.join(testCwd, "file.json"),
          relativePath: "file.json",
          content: {
            value: 3,
            value2: 2,
            value3: 1,
            valueDeep: {
              a: [1, 2, 6, 7],
            },
            valueIndependent: true,
          },
          local: false,
          once: false,
        },
      ]);
    });

    test("should merge value from customization file into resulting file", async () => {
      importFromMock.mockImplementationOnce(() => ({
        value2: 2,
      }));
      const files = groupFiles(
        [
          {
            type: CoatManifestFileType.Json,
            content: {
              value: 1,
            },
            file: "file.json",
          },
        ],
        testContext
      );
      // Place empty file to trick mergeFiles into believing a customization file exists
      await fsExtra.outputFile("/test-cwd/file.json-custom.js", "");

      const result = await mergeFiles(files, testContext);
      expect(result).toEqual([
        {
          file: path.join("/test-cwd", "file.json"),
          relativePath: "file.json",
          type: CoatManifestFileType.Json,
          content: {
            value: 1,
            value2: 2,
          },
          once: false,
          local: false,
        },
      ]);
    });

    test("should throw error if customization file can't be parsed", async () => {
      expect.assertions(1);
      importFromMock.mockImplementationOnce(() => {
        throw new Error("Parsing issue");
      });
      const files = groupFiles(
        [
          {
            type: CoatManifestFileType.Json,
            content: {
              value: 1,
            },
            file: "file.json",
          },
        ],
        testContext
      );
      // Place empty file to trick mergeFiles into believing a customization file exists
      await fsExtra.outputFile("/test-cwd/file.json-custom.js", "");

      try {
        await mergeFiles(files, testContext);
      } catch (error) {
        expect(error.message).toMatchInlineSnapshot(`"Parsing issue"`);
      }
    });
  });

  describe("text files", () => {
    test("should merge multiple text files", async () => {
      const files = groupFiles(
        [
          {
            type: CoatManifestFileType.Text,
            content: "First value",
            file: "file.txt",
          },
          {
            type: CoatManifestFileType.Text,
            content: "Second value",
            file: "file.txt",
          },
          {
            type: CoatManifestFileType.Text,
            content: "Third value",
            file: "folder-1/../file.txt",
          },
        ],
        testContext
      );
      const result = await mergeFiles(files, testContext);
      expect(result).toEqual([
        {
          type: CoatManifestFileType.Text,
          file: path.join(testCwd, "file.txt"),
          relativePath: "file.txt",
          content: "Third value",
          local: false,
          once: false,
        },
      ]);
    });

    test("should merge value from customization file into resulting file", async () => {
      importFromMock.mockImplementationOnce(() => "Custom value");
      const files = groupFiles(
        [
          {
            type: CoatManifestFileType.Text,
            content: "First value",
            file: "file.txt",
          },
        ],
        testContext
      );
      // Place empty file to trick mergeFiles into believing a customization file exists
      await fsExtra.outputFile("/test-cwd/file.txt-custom.js", "");

      const result = await mergeFiles(files, testContext);
      expect(result).toEqual([
        {
          file: path.join("/test-cwd", "file.txt"),
          relativePath: "file.txt",
          type: CoatManifestFileType.Text,
          content: "Custom value",
          local: false,
          once: false,
        },
      ]);
    });
  });

  describe("yaml files", () => {
    test("should merge multiple yaml files", async () => {
      const files = groupFiles(
        [
          {
            type: CoatManifestFileType.Yaml,
            content: {
              firstProp: true,
            },
            file: "file.yaml",
          },
          {
            type: CoatManifestFileType.Yaml,
            content: {
              secondProp: {
                second: true,
              },
            },
            file: "file.yaml",
          },
          {
            type: CoatManifestFileType.Yaml,
            content: {
              firstProp: false,
              thirdProp: [1, 2, 3],
            },
            file: "folder-1/../file.yaml",
          },
        ],
        testContext
      );
      const result = await mergeFiles(files, testContext);
      expect(result).toEqual([
        {
          type: CoatManifestFileType.Yaml,
          file: path.join(testCwd, "file.yaml"),
          relativePath: "file.yaml",
          content: {
            firstProp: false,
            secondProp: {
              second: true,
            },
            thirdProp: [1, 2, 3],
          },
          once: false,
          local: false,
        },
      ]);
    });

    test("should merge value from customization file into resulting file", async () => {
      importFromMock.mockImplementationOnce(() => ({ customProp: true }));
      const files = groupFiles(
        [
          {
            type: CoatManifestFileType.Yaml,
            content: { firstProp: true },
            file: "file.yaml",
          },
        ],
        testContext
      );
      // Place empty file to trick mergeFiles into believing a customization file exists
      await fsExtra.outputFile("/test-cwd/file.yaml-custom.js", "");

      const result = await mergeFiles(files, testContext);
      expect(result).toEqual([
        {
          file: path.join("/test-cwd", "file.yaml"),
          relativePath: "file.yaml",
          type: CoatManifestFileType.Yaml,
          local: false,
          once: false,
          content: { firstProp: true, customProp: true },
        },
      ]);
    });
  });
});
