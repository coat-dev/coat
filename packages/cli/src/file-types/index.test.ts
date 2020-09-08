import { FileTypeFunctions, getMergeFunction, getPolishFunction } from ".";
import {
  CoatManifestFileContentTypesMap,
  CoatManifestFileType,
} from "../types/coat-manifest-file";
import { jsonFileFunctions } from "./json";
import { textFileFunctions } from "./text";
import { yamlFileFunctions } from "./yaml";

describe("file-types/index - getMergeFunction", () => {
  test("should be exported correctly", () => {
    expect(getMergeFunction).toBeInstanceOf(Function);
  });

  test("should return correct function for each file type", () => {
    const fileTypeFunctions: {
      [key in CoatManifestFileType]: FileTypeFunctions<
        CoatManifestFileContentTypesMap[key]
      >["merge"];
    } = {
      [CoatManifestFileType.Json]: jsonFileFunctions.merge,
      [CoatManifestFileType.Yaml]: yamlFileFunctions.merge,
      [CoatManifestFileType.Text]: textFileFunctions.merge,
    };

    Object.entries(fileTypeFunctions).forEach(([fileType, func]) => {
      expect(
        // @ts-expect-error
        getMergeFunction({
          type: fileType as CoatManifestFileType,
        })
      ).toBe(func);
    });
  });

  test("should throw error for unknown file type", () => {
    expect(() =>
      // @ts-expect-error
      getMergeFunction({ type: "Unknown" })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Cannot merge unknown file type: Unknown"`
    );
  });
});

describe("file-types/index - getPolishFunction", () => {
  test("should be exported correctly", () => {
    expect(getPolishFunction).toBeInstanceOf(Function);
  });

  test("should return correct function for each file type", () => {
    const fileTypeFunctions: {
      [key in CoatManifestFileType]: FileTypeFunctions<
        CoatManifestFileContentTypesMap[key]
      >["polish"];
    } = {
      [CoatManifestFileType.Json]: jsonFileFunctions.polish,
      [CoatManifestFileType.Yaml]: yamlFileFunctions.polish,
      [CoatManifestFileType.Text]: textFileFunctions.polish,
    };

    Object.entries(fileTypeFunctions).forEach(([fileType, func]) => {
      expect(
        // @ts-expect-error
        getPolishFunction({
          type: fileType as CoatManifestFileType,
        })
      ).toBe(func);
    });
  });

  test("should throw error for unknown file type", () => {
    expect(() =>
      // @ts-expect-error
      getPolishFunction({ type: "Unknown" })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Cannot polish unknown file type: Unknown"`
    );
  });
});
