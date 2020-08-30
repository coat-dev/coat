import path from "path";
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

describe("sync/get-unmanaged-files", () => {
  test("should return empty array if lockfile does not exist", () => {
    const newLockfileFiles = [
      {
        path: "a.json",
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
      testContext.coatGlobalLockfile,
      testContext
    );
    expect(unmanagedFiles).toEqual([]);
  });

  test("should return empty array if all files in lockfile are still managed", () => {
    const newLockfileFiles = [
      {
        path: "a.json",
      },
      {
        path: "b.json",
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
          },
          { path: "b.json" },
        ],
      }),
      coatLocalLockfile: getStrictCoatLocalLockfile({
        version: COAT_LOCAL_LOCKFILE_VERSION,
      }),
    };

    const unmanagedFiles = getUnmanagedFiles(
      newLockfileFiles,
      testContext.coatGlobalLockfile,
      testContext
    );
    expect(unmanagedFiles).toEqual([]);
  });

  test("should return files that are not managed anymore", () => {
    const newLockfileFiles = [
      {
        path: "a.json",
      },
      {
        path: "b.json",
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
          { path: "a.json" },
          { path: "b.json" },
          { path: "c.json" },
          { path: "d.json" },
        ],
      }),
      coatLocalLockfile: getStrictCoatLocalLockfile({
        version: COAT_LOCAL_LOCKFILE_VERSION,
      }),
    };

    const unmanagedFiles = getUnmanagedFiles(
      newLockfileFiles,
      testContext.coatGlobalLockfile,
      testContext
    );
    expect(unmanagedFiles).toEqual([
      path.join("test", "c.json"),
      path.join("test", "d.json"),
    ]);
  });
});
