import { CoatContext } from "../types/coat-context";
import { getStrictCoatManifest } from "../util/get-strict-coat-manifest";
import { getUnmanagedFiles } from "./get-unmanaged-files";
import {
  getStrictCoatGlobalLockfile,
  getStrictCoatLocalLockfile,
} from "../lockfiles/get-strict-coat-lockfiles";
import {
  COAT_GLOBAL_LOCKFILE_VERSION,
  COAT_LOCAL_LOCKFILE_VERSION,
} from "../constants";
import { CoatLockfileFileEntryStrict } from "../types/coat-lockfiles";

describe("sync/get-unmanaged-files", () => {
  test("should return empty array if lockfile does not exist", () => {
    const newLockfileFiles = [
      {
        path: "a.json",
        hash: "a.json-hash",
        once: false,
      },
    ];
    const testContext: CoatContext = {
      coatManifest: getStrictCoatManifest({
        name: "test-project",
      }),
      cwd: "test",
      packageJson: {},
      coatGlobalLockfile: getStrictCoatGlobalLockfile({
        version: COAT_GLOBAL_LOCKFILE_VERSION,
      }),
      coatLocalLockfile: getStrictCoatLocalLockfile({
        version: COAT_LOCAL_LOCKFILE_VERSION,
      }),
    };

    const unmanagedFiles = getUnmanagedFiles(
      newLockfileFiles,
      testContext.coatGlobalLockfile
    );
    expect(unmanagedFiles).toEqual([]);
  });

  test("should return empty array if all files in lockfile are still managed", () => {
    const newLockfileFiles = [
      {
        path: "a.json",
        hash: "a.json-hash",
        once: false,
      },
      {
        path: "b.json",
        hash: "b.json-hash",
        once: false,
      },
    ];
    const testContext: CoatContext = {
      coatManifest: getStrictCoatManifest({
        name: "test-project",
      }),
      cwd: "test",
      packageJson: {},
      coatGlobalLockfile: getStrictCoatGlobalLockfile({
        version: 1,
        files: [
          {
            path: "a.json",
            hash: "a.json-hash",
          },
          { path: "b.json", hash: "b.json-hash" },
        ],
      }),
      coatLocalLockfile: getStrictCoatLocalLockfile({
        version: COAT_LOCAL_LOCKFILE_VERSION,
      }),
    };

    const unmanagedFiles = getUnmanagedFiles(
      newLockfileFiles,
      testContext.coatGlobalLockfile
    );
    expect(unmanagedFiles).toEqual([]);
  });

  test("should return files that are not managed anymore", () => {
    const newLockfileFiles = [
      {
        path: "a.json",
        hash: "a.json-hash",
        once: false,
      },
      {
        path: "b.json",
        hash: "b.json-hash",
        once: false,
      },
    ];
    const testContext: CoatContext = {
      coatManifest: getStrictCoatManifest({
        name: "test-project",
      }),
      cwd: "test",
      packageJson: {},
      coatGlobalLockfile: getStrictCoatGlobalLockfile({
        version: COAT_GLOBAL_LOCKFILE_VERSION,
        files: [
          { path: "a.json", hash: "a.json-hash" },
          { path: "b.json", hash: "b.json-hash" },
          { path: "c.json", hash: "c.json-hash" },
          { path: "d.json", hash: "d.json-hash" },
        ],
      }),
      coatLocalLockfile: getStrictCoatLocalLockfile({
        version: COAT_LOCAL_LOCKFILE_VERSION,
      }),
    };

    const unmanagedFiles = getUnmanagedFiles(
      newLockfileFiles,
      testContext.coatGlobalLockfile
    );
    expect(unmanagedFiles).toEqual([
      {
        path: "c.json",
        hash: "c.json-hash",
        once: false,
      },
      {
        path: "d.json",
        hash: "d.json-hash",
        once: false,
      },
    ]);
  });

  test("should not return once files that are not managed anymore", () => {
    const newLockfileFiles: CoatLockfileFileEntryStrict[] = [
      {
        path: "a.json",
        once: true,
      },
      {
        path: "b.json",
        once: true,
      },
    ];
    const testContext: CoatContext = {
      coatManifest: getStrictCoatManifest({
        name: "test-project",
      }),
      cwd: "test",
      packageJson: {},
      coatGlobalLockfile: getStrictCoatGlobalLockfile({
        version: COAT_GLOBAL_LOCKFILE_VERSION,
        files: [
          { path: "a.json", once: true },
          { path: "b.json", once: true },
          { path: "c.json", once: true },
          { path: "d.json", once: true },
        ],
      }),
      coatLocalLockfile: getStrictCoatLocalLockfile({
        version: COAT_LOCAL_LOCKFILE_VERSION,
      }),
    };

    const unmanagedFiles = getUnmanagedFiles(
      newLockfileFiles,
      testContext.coatGlobalLockfile
    );
    expect(unmanagedFiles).toEqual([]);
  });
});
