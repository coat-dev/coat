import path from "path";
import { CoatContext } from "../types/coat-context";
import { CoatLockfile } from "../types/coat-lockfile";
import { getStrictCoatManifest } from "../util/get-strict-coat-manifest";
import { getUnmanagedFiles } from "./get-unmanaged-files";

describe("sync/get-unmanaged-files", () => {
  test("should return empty array if lockfile does not exist", () => {
    const newLockfile: CoatLockfile = {
      version: 1,
      files: [
        {
          path: "a.json",
        },
      ],
    };
    const testContext: CoatContext = {
      coatManifest: getStrictCoatManifest({
        name: "test-project",
      }),
      cwd: "test",
      packageJson: {},
      coatLockfile: undefined,
    };

    const unmanagedFiles = getUnmanagedFiles(newLockfile, testContext);
    expect(unmanagedFiles).toEqual([]);
  });

  test("should return empty array if all files in lockfile are still managed", () => {
    const newLockfile: CoatLockfile = {
      version: 1,
      files: [
        {
          path: "a.json",
        },
        {
          path: "b.json",
        },
      ],
    };
    const testContext: CoatContext = {
      coatManifest: getStrictCoatManifest({
        name: "test-project",
      }),
      cwd: "test",
      packageJson: {},
      coatLockfile: {
        version: 1,
        files: [
          {
            path: "a.json",
          },
          { path: "b.json" },
        ],
      },
    };

    const unmanagedFiles = getUnmanagedFiles(newLockfile, testContext);
    expect(unmanagedFiles).toEqual([]);
  });

  test("should return files that are not managed anymore", () => {
    const newLockfile: CoatLockfile = {
      version: 1,
      files: [
        {
          path: "a.json",
        },
        {
          path: "b.json",
        },
      ],
    };
    const testContext: CoatContext = {
      coatManifest: getStrictCoatManifest({
        name: "test-project",
      }),
      cwd: "test",
      packageJson: {},
      coatLockfile: {
        version: 1,
        files: [
          { path: "a.json" },
          { path: "b.json" },
          { path: "c.json" },
          { path: "d.json" },
        ],
      },
    };

    const unmanagedFiles = getUnmanagedFiles(newLockfile, testContext);
    expect(unmanagedFiles).toEqual([
      path.join("test", "c.json"),
      path.join("test", "d.json"),
    ]);
  });
});
