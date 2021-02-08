import {
  COAT_GLOBAL_LOCKFILE_VERSION,
  COAT_LOCAL_LOCKFILE_VERSION,
} from "../constants";
import {
  getStrictCoatGlobalLockfile,
  getStrictCoatLocalLockfile,
} from "../lockfiles/get-strict-coat-lockfiles";
import { removeUnmanagedTasksFromLockfile } from "./remove-unmanaged-tasks-from-lockfile";
import { CoatTaskType } from "../types/coat-manifest-tasks";

describe("setup/remove-unmanaged-tasks-from-lockfile", () => {
  const baseGlobalLockfile = getStrictCoatGlobalLockfile({
    version: COAT_GLOBAL_LOCKFILE_VERSION,
    setup: {
      oldGlobalTask: { oldGlobalResult: true },
    },
  });
  const baseLocalLockfile = getStrictCoatLocalLockfile({
    version: COAT_LOCAL_LOCKFILE_VERSION,
    setup: {
      oldLocalTask: { oldLocalResult: true },
    },
  });

  test("should work with empty tasks array", () => {
    const updatedLockfile = removeUnmanagedTasksFromLockfile(
      baseGlobalLockfile,
      []
    );
    expect(updatedLockfile).toEqual({
      version: COAT_GLOBAL_LOCKFILE_VERSION,
      setup: {},
      files: [],
      scripts: [],
      dependencies: {
        dependencies: [],
        devDependencies: [],
        peerDependencies: [],
        optionalDependencies: [],
      },
    });
  });

  test("should work with only passing local tasks", () => {
    const updatedLockfile = removeUnmanagedTasksFromLockfile(
      baseLocalLockfile,
      [
        {
          id: "oldLocalTask",
          type: CoatTaskType.Local,
          run: () => ({}),
        },
      ]
    );
    expect(updatedLockfile).toEqual({
      version: COAT_LOCAL_LOCKFILE_VERSION,
      setup: {
        oldLocalTask: {
          oldLocalResult: true,
        },
      },
      files: [],
    });
  });

  test("should work with only passing global tasks", () => {
    const updatedLockfile = removeUnmanagedTasksFromLockfile(
      baseGlobalLockfile,
      [
        {
          id: "oldGlobalTask",
          type: CoatTaskType.Global,
          run: () => ({}),
        },
      ]
    );
    expect(updatedLockfile).toEqual({
      version: COAT_GLOBAL_LOCKFILE_VERSION,
      setup: {
        oldGlobalTask: {
          oldGlobalResult: true,
        },
      },
      files: [],
      scripts: [],
      dependencies: {
        dependencies: [],
        devDependencies: [],
        peerDependencies: [],
        optionalDependencies: [],
      },
    });
  });

  test("should not modify input lockfile", () => {
    const lockfileCopy = JSON.parse(JSON.stringify(baseGlobalLockfile));

    removeUnmanagedTasksFromLockfile(baseGlobalLockfile, []);

    expect(lockfileCopy).toEqual(baseGlobalLockfile);
  });
});
