import path from "path";
import {
  COAT_GLOBAL_LOCKFILE_VERSION,
  COAT_LOCAL_LOCKFILE_VERSION,
} from "../constants";
import {
  getStrictCoatGlobalLockfile,
  getStrictCoatLocalLockfile,
} from "../lockfiles/get-strict-coat-lockfiles";
import { CoatContext } from "../types/coat-context";
import {
  CoatManifestFile,
  CoatManifestFileType,
} from "../types/coat-manifest-file";
import { getStrictCoatManifest } from "../util/get-strict-coat-manifest";
import { groupFiles } from "./group-files";

const platformRoot = path.parse(process.cwd()).root;
const testCwd = path.join(platformRoot, "test");

describe("sync/group-files", () => {
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

  test('should return normalized file path as "file" property', () => {
    const files: CoatManifestFile[] = [
      {
        file: "file.json",
        content: { a: true },
        type: CoatManifestFileType.Json,
      },
    ];
    const result = groupFiles(files, testContext);
    expect(Object.values(result)[0]).toHaveProperty(
      "file",
      path.join(testCwd, "file.json")
    );
  });

  test("should add relative file property", () => {
    const files: CoatManifestFile[] = [
      {
        file: "folder-1/../file.json",
        content: { a: true },
        type: CoatManifestFileType.Json,
      },
    ];
    const result = groupFiles(files, testContext);
    expect(Object.values(result)[0]).toHaveProperty(
      "relativePath",
      "file.json"
    );
  });

  test("should add correct once property", () => {
    const files: CoatManifestFile[] = [
      {
        file: "file1.json",
        content: { a: true },
        type: CoatManifestFileType.Json,
      },
      {
        file: "file2.json",
        content: { a: true },
        type: CoatManifestFileType.Json,
        once: false,
      },
      {
        file: "file3.json",
        content: { a: true },
        type: CoatManifestFileType.Json,
        once: true,
      },
    ];
    const result = groupFiles(files, testContext);
    Object.values(result).forEach((file) => {
      switch (file.relativePath) {
        case "file1.json":
        case "file2.json":
          expect(file).toHaveProperty("once", false);
          break;
        case "file3.json":
          expect(file).toHaveProperty("once", true);
          break;
        default:
          throw new Error("Unexpected file");
      }
    });
  });

  test("should add correct local property", () => {
    const files: CoatManifestFile[] = [
      {
        file: "file1.json",
        content: { a: true },
        type: CoatManifestFileType.Json,
      },
      {
        file: "file2.json",
        content: { a: true },
        type: CoatManifestFileType.Json,
        local: false,
      },
      {
        file: "file3.json",
        content: { a: true },
        type: CoatManifestFileType.Json,
        local: true,
      },
    ];
    const result = groupFiles(files, testContext);
    Object.values(result).forEach((file) => {
      switch (file.relativePath) {
        case "file1.json":
        case "file2.json":
          expect(file).toHaveProperty("local", false);
          break;
        case "file3.json":
          expect(file).toHaveProperty("local", true);
          break;
        default:
          throw new Error("Unexpected file");
      }
    });
  });

  test("should place content for single file into an array", () => {
    const files: CoatManifestFile[] = [
      {
        file: "file1.json",
        content: { a: true },
        type: CoatManifestFileType.Json,
      },
    ];
    const result = groupFiles(files, testContext);
    expect(Object.values(result)[0]).toHaveProperty("content", [
      {
        a: true,
      },
    ]);
  });

  test("should merge content for multiple files for the same path into an array", () => {
    const files: CoatManifestFile[] = [
      {
        file: "file1.json",
        content: { a: true },
        type: CoatManifestFileType.Json,
      },
      {
        file: "file1.json",
        content: { b: true },
        type: CoatManifestFileType.Json,
      },
      {
        file: "folder-1/../file1.json",
        content: { c: true },
        type: CoatManifestFileType.Json,
      },
    ];
    const result = groupFiles(files, testContext);
    expect(Object.values(result)[0]).toHaveProperty("content", [
      {
        a: true,
      },
      {
        b: true,
      },
      {
        c: true,
      },
    ]);
  });

  test("should overwrite the previous files once and local properties when merging", () => {
    const files: CoatManifestFile[] = [
      {
        file: "file1.json",
        content: { a: true },
        type: CoatManifestFileType.Json,
        local: false,
      },
      {
        file: "file1.json",
        content: { b: true },
        type: CoatManifestFileType.Json,
        once: false,
      },
      {
        file: "folder-1/../file1.json",
        content: { c: true },
        type: CoatManifestFileType.Json,
        local: true,
        once: true,
      },
    ];
    const result = groupFiles(files, testContext);
    expect(Object.values(result)[0]).toHaveProperty("once", true);
    expect(Object.values(result)[0]).toHaveProperty("local", true);
  });
});
