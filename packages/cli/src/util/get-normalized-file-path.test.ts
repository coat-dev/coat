import path from "path";
import { getNormalizedFilePath } from "./get-normalized-file-path";
import { CoatContext } from "../types/coat-context";
import { getStrictCoatManifest } from "./get-strict-coat-manifest";

describe("util/get-normalized-file-path", () => {
  function buildTestContext(cwd: string): CoatContext {
    return {
      cwd,
      coatManifest: getStrictCoatManifest({
        name: "hi",
      }),
      packageJson: {},
    };
  }

  test("should throw error if absolute path is provided", () => {
    expect(() =>
      getNormalizedFilePath("/hi-there", buildTestContext("test"))
    ).toThrowErrorMatchingInlineSnapshot(
      `"Absolute paths of files from the repository root are not yet implemented"`
    );
  });

  test("should return normalized path outside of the context cwd", () => {
    const result = getNormalizedFilePath(
      "../file.json",
      buildTestContext(path.join("/var", "opt", "project", "hi"))
    );
    expect(result).toBe(path.join("/var", "opt", "project", "file.json"));
  });

  test("should return normalized path from weird relative path within the context cwd", () => {
    const result = getNormalizedFilePath(
      "./folder-1/../folder-2/../../hi/file.json",
      buildTestContext(path.join("/var", "opt", "project", "hi"))
    );
    expect(result).toBe(path.join("/var", "opt", "project", "hi", "file.json"));
  });
});
