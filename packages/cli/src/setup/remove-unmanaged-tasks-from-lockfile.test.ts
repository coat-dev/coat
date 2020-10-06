import path from "path";
import { vol } from "memfs";
import {
  COAT_GLOBAL_LOCKFILE_VERSION,
  COAT_LOCAL_LOCKFILE_VERSION,
} from "../constants";
import {
  getStrictCoatGlobalLockfile,
  getStrictCoatLocalLockfile,
} from "../lockfiles/get-strict-coat-lockfiles";
import { CoatContext } from "../types/coat-context";
import { getStrictCoatManifest } from "../util/get-strict-coat-manifest";
import { removeUnmanagedTasksFromLockfiles } from "./remove-unmanaged-tasks-from-lockfile";
import { CoatTaskType } from "../types/coat-manifest-tasks";

jest.mock("fs");

const platformRoot = path.parse(process.cwd()).root;
const testCwd = path.join(platformRoot, "test");

describe("setup/remove-unmanaged-tasks-from-lockfile", () => {
  afterEach(() => {
    vol.reset();
  });

  const testContext: CoatContext = {
    cwd: testCwd,
    coatManifest: getStrictCoatManifest({
      name: "test",
    }),
    packageJson: {},
    coatGlobalLockfile: getStrictCoatGlobalLockfile({
      version: COAT_GLOBAL_LOCKFILE_VERSION,
      setup: {
        oldGlobalTask: { oldGlobalResult: true },
      },
    }),
    coatLocalLockfile: getStrictCoatLocalLockfile({
      version: COAT_LOCAL_LOCKFILE_VERSION,
      setup: {
        oldLocalTask: { oldLocalResult: true },
      },
    }),
  };

  test("should work without passing empty local and global tasks", async () => {
    const newContext = await removeUnmanagedTasksFromLockfiles(
      [],
      [],
      testContext
    );
    expect(newContext.coatGlobalLockfile).toEqual({
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
    expect(newContext.coatLocalLockfile).toEqual({
      version: COAT_LOCAL_LOCKFILE_VERSION,
      setup: {},
      files: [],
    });
  });

  test("should work with only passing local tasks", async () => {
    const newContext = await removeUnmanagedTasksFromLockfiles(
      [],
      [
        {
          id: "oldLocalTask",
          type: CoatTaskType.Local,
          run: () => ({}),
        },
      ],
      testContext
    );
    expect(newContext.coatGlobalLockfile).toEqual({
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
    expect(newContext.coatLocalLockfile).toEqual({
      version: COAT_LOCAL_LOCKFILE_VERSION,
      setup: {
        oldLocalTask: {
          oldLocalResult: true,
        },
      },
      files: [],
    });
  });

  test("should work with only passing global tasks", async () => {
    const newContext = await removeUnmanagedTasksFromLockfiles(
      [
        {
          id: "oldGlobalTask",
          type: CoatTaskType.Global,
          run: () => ({}),
        },
      ],
      [],
      testContext
    );
    expect(newContext.coatGlobalLockfile).toEqual({
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
    expect(newContext.coatLocalLockfile).toEqual({
      version: COAT_LOCAL_LOCKFILE_VERSION,
      setup: {},
      files: [],
    });
  });

  test("should not modify input context", async () => {
    const testContextCopy = JSON.parse(JSON.stringify(testContext));
    await removeUnmanagedTasksFromLockfiles([], [], testContext);
    expect(testContextCopy).toEqual(testContext);
  });
});
