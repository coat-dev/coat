import fsExtra from "fs-extra";
import fs from "fs";
import path from "path";
import { vol } from "memfs";
import importFrom from "import-from";
import { mergeFiles } from "./merge-files";
import { CoatContext } from "../types/coat-context";
import { getStrictCoatManifest } from "../util/get-strict-coat-manifest";
import {
  CoatManifestFile,
  CoatManifestFileType,
} from "../types/coat-manifest-file";

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
    coatLockfile: undefined,
  };

  test("should work with empty array", async () => {
    const files: CoatManifestFile[][] = [];
    const result = await mergeFiles(files, testContext);
    expect(result).toEqual([]);
  });

  test("should work with an array of empty arrays", async () => {
    const files: CoatManifestFile[][] = [[], [], []];
    const result = await mergeFiles(files, testContext);
    expect(result).toEqual([]);
  });

  test("should return single file unchanged with a normalized file path", async () => {
    const files: CoatManifestFile[][] = [
      [
        {
          type: CoatManifestFileType.Json,
          content: {
            value: 1,
          },
          file: "folder-1/../file.json",
        },
      ],
    ];
    const result = await mergeFiles(files, testContext);
    expect(result).toEqual([
      {
        type: CoatManifestFileType.Json,
        file: path.join(testCwd, "file.json"),
        content: {
          value: 1,
        },
      },
    ]);
  });

  test("should not place file if an entry exists with null for it afterwards", async () => {
    const files: CoatManifestFile[][] = [
      [
        {
          type: CoatManifestFileType.Json,
          content: {
            value: 1,
          },
          file: "path.json",
        },
      ],
      [],
      [
        {
          file: "path.json",
          content: null,
          type: CoatManifestFileType.Json,
        },
      ],
    ];
    const result = await mergeFiles(files, testContext);
    expect(result).toEqual([]);
  });

  test("should place file if an entry exists after a deleted file", async () => {
    const files: CoatManifestFile[][] = [
      [
        {
          type: CoatManifestFileType.Json,
          content: {
            value: 1,
          },
          file: "path.json",
        },
      ],
      [],
      [
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
    ];
    const result = await mergeFiles(files, testContext);
    expect(result).toEqual([
      {
        file: path.join("/test-cwd", "path.json"),
        type: CoatManifestFileType.Json,
        content: {
          value2: 3,
        },
      },
    ]);
  });

  test("should throw an error if the same file has mismatching types in entries", async () => {
    expect.assertions(1);
    const files: CoatManifestFile[][] = [
      [
        {
          type: CoatManifestFileType.Json,
          content: {
            value: 1,
          },
          file: "path.json",
        },
      ],
      [],
      [
        {
          file: "path.json",
          content: {
            value: 5,
          },
          // @ts-expect-error
          type: "Unknown",
        },
      ],
    ];
    try {
      await mergeFiles(files, testContext);
    } catch (error) {
      expect(error.message).toMatchInlineSnapshot(
        `"Mismatching file types for same file path"`
      );
    }
  });

  test("should call content function with result from previously merged file entries", async () => {
    const file1 = jest.fn(() => ({
      value1: 1,
    }));
    const file2 = jest.fn(() => ({
      value2: 2,
    }));
    const file3 = jest.fn((input) => ({
      ...input,
      value3: 3,
    }));
    const files: CoatManifestFile[][] = [
      [
        {
          type: CoatManifestFileType.Json,
          content: file1,
          file: "path.json",
        },
      ],
      [],
      [
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
    ];
    const result = await mergeFiles(files, testContext);

    expect(file1).toHaveBeenCalledTimes(1);
    expect(file2).toHaveBeenCalledTimes(1);
    expect(file3).toHaveBeenCalledTimes(1);

    expect(file1).toHaveBeenCalledWith(undefined);
    expect(file2).toHaveBeenCalledWith({ value1: 1 });
    expect(file3).toHaveBeenCalledWith({ value2: 2 });

    expect(result).toEqual([
      {
        file: path.join("/test-cwd", "path.json"),
        type: CoatManifestFileType.Json,
        content: {
          value2: 2,
          value3: 3,
        },
      },
    ]);
  });

  test("should not place file if last file content function returns null", async () => {
    const file1 = jest.fn(() => ({
      value1: 1,
    }));
    const file2 = jest.fn(() => ({
      value2: 2,
    }));
    const file3 = jest.fn(() => null);
    const files: CoatManifestFile[][] = [
      [
        {
          type: CoatManifestFileType.Json,
          content: file1,
          file: "path.json",
        },
      ],
      [],
      [
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
    ];
    const result = await mergeFiles(files, testContext);

    expect(file1).toHaveBeenCalledTimes(1);
    expect(file2).toHaveBeenCalledTimes(1);
    expect(file3).toHaveBeenCalledTimes(1);

    expect(file1).toHaveBeenCalledWith(undefined);
    expect(file2).toHaveBeenCalledWith({ value1: 1 });
    expect(file3).toHaveBeenCalledWith({ value2: 2 });

    expect(result).toEqual([]);
  });

  test("should throw an error when trying to merge unknown file types", async () => {
    expect.assertions(1);
    const files: CoatManifestFile[][] = [
      [
        {
          // @ts-expect-error
          type: "unknown",
          content: { value: 1 },
          file: "path.yml",
        },
      ],
      [],
      [
        {
          file: "path.json",
          content: { value2: 2 },
          // @ts-expect-error
          type: "unknown",
        },
      ],
    ];
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
    const files: CoatManifestFile[][] = [
      [
        {
          type: CoatManifestFileType.Json,
          content: {
            value: 1,
          },
          file: "file.json",
        },
      ],
    ];

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

    const files: CoatManifestFile[][] = [
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
    ];
    // Place empty files to trick mergeFiles into believing a customization file exists
    await Promise.all([
      fsExtra.outputFile("/test-cwd/file.json-custom.js", ""),
      fsExtra.outputFile("/test-cwd/file.txt-custom.js", ""),
    ]);

    const result = await mergeFiles(files, testContext);
    expect(result).toEqual([]);
  });

  describe("json files", () => {
    test("should merge multiple json files", async () => {
      const files: CoatManifestFile[][] = [
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
        ],
        [
          {
            type: CoatManifestFileType.Json,
            content: {
              value: 3,
              value2: 2,
              value3: 1,
              valueDeep: {
                a: [2, 6, 7],
              },
            },
            file: "folder-1/../file.json",
          },
        ],
      ];
      const result = await mergeFiles(files, testContext);
      expect(result).toEqual([
        {
          type: CoatManifestFileType.Json,
          file: path.join(testCwd, "file.json"),
          content: {
            value: 3,
            value2: 2,
            value3: 1,
            valueDeep: {
              a: [1, 2, 3, 6, 7],
            },
            valueIndependent: true,
          },
        },
      ]);
    });

    test("should merge value from customization file into resulting file", async () => {
      importFromMock.mockImplementationOnce(() => ({
        value2: 2,
      }));
      const files: CoatManifestFile[][] = [
        [
          {
            type: CoatManifestFileType.Json,
            content: {
              value: 1,
            },
            file: "file.json",
          },
        ],
      ];
      // Place empty file to trick mergeFiles into believing a customization file exists
      await fsExtra.outputFile("/test-cwd/file.json-custom.js", "");

      const result = await mergeFiles(files, testContext);
      expect(result).toEqual([
        {
          file: path.join("/test-cwd", "file.json"),
          type: CoatManifestFileType.Json,
          content: {
            value: 1,
            value2: 2,
          },
        },
      ]);
    });

    test("should throw error if customization file can't be parsed", async () => {
      expect.assertions(1);
      importFromMock.mockImplementationOnce(() => {
        throw new Error("Parsing issue");
      });
      const files: CoatManifestFile[][] = [
        [
          {
            type: CoatManifestFileType.Json,
            content: {
              value: 1,
            },
            file: "file.json",
          },
        ],
      ];
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
      const files: CoatManifestFile[][] = [
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
        ],
        [
          {
            type: CoatManifestFileType.Text,
            content: "Third value",
            file: "folder-1/../file.txt",
          },
        ],
      ];
      const result = await mergeFiles(files, testContext);
      expect(result).toEqual([
        {
          type: CoatManifestFileType.Text,
          file: path.join(testCwd, "file.txt"),
          content: "Third value",
        },
      ]);
    });

    test("should merge value from customization file into resulting file", async () => {
      importFromMock.mockImplementationOnce(() => "Custom value");
      const files: CoatManifestFile[][] = [
        [
          {
            type: CoatManifestFileType.Text,
            content: "First value",
            file: "file.txt",
          },
        ],
      ];
      // Place empty file to trick mergeFiles into believing a customization file exists
      await fsExtra.outputFile("/test-cwd/file.txt-custom.js", "");

      const result = await mergeFiles(files, testContext);
      expect(result).toEqual([
        {
          file: path.join("/test-cwd", "file.txt"),
          type: CoatManifestFileType.Text,
          content: "Custom value",
        },
      ]);
    });
  });

  describe("yaml files", () => {
    test("should merge multiple yaml files", async () => {
      const files: CoatManifestFile[][] = [
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
        ],
        [
          {
            type: CoatManifestFileType.Yaml,
            content: {
              firstProp: false,
              thirdProp: [1, 2, 3],
            },
            file: "folder-1/../file.yaml",
          },
        ],
      ];
      const result = await mergeFiles(files, testContext);
      expect(result).toEqual([
        {
          type: CoatManifestFileType.Yaml,
          file: path.join(testCwd, "file.yaml"),
          content: {
            firstProp: false,
            secondProp: {
              second: true,
            },
            thirdProp: [1, 2, 3],
          },
        },
      ]);
    });

    test("should merge value from customization file into resulting file", async () => {
      importFromMock.mockImplementationOnce(() => ({ customProp: true }));
      const files: CoatManifestFile[][] = [
        [
          {
            type: CoatManifestFileType.Yaml,
            content: { firstProp: true },
            file: "file.yaml",
          },
        ],
      ];
      // Place empty file to trick mergeFiles into believing a customization file exists
      await fsExtra.outputFile("/test-cwd/file.yaml-custom.js", "");

      const result = await mergeFiles(files, testContext);
      expect(result).toEqual([
        {
          file: path.join("/test-cwd", "file.yaml"),
          type: CoatManifestFileType.Yaml,
          content: { firstProp: true, customProp: true },
        },
      ]);
    });
  });
});
