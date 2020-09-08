import path from "path";
import { getNormalizedFilePath } from "./get-normalized-file-path";
import { CoatContext } from "../types/coat-context";
import { getStrictCoatManifest } from "./get-strict-coat-manifest";
import {
  getStrictCoatGlobalLockfile,
  getStrictCoatLocalLockfile,
} from "../lockfiles/get-strict-coat-lockfiles";
import {
  COAT_GLOBAL_LOCKFILE_VERSION,
  COAT_LOCAL_LOCKFILE_VERSION,
} from "../constants";

describe("util/get-normalized-file-path", () => {
  function buildTestContext(cwd: string): CoatContext {
    return {
      cwd,
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
