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
  CoatManifestTaskStrict,
  CoatTaskType,
  CoatTaskRunOptions,
} from "../types/coat-manifest-tasks";
import { getStrictCoatManifest } from "../util/get-strict-coat-manifest";
import { getTasksToRun } from "./get-tasks-to-run";

describe("setup/get-tasks-to-run", () => {
  const testContext: CoatContext = {
    cwd: "test-cwd",
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

  test("should work with an empty array", async () => {
    await expect(getTasksToRun([], testContext, false)).resolves.toEqual([]);
  });

  test("should return all tasks if run with the force = true option", async () => {
    const global1Run = jest.fn();
    const local1Run = jest.fn();
    const global2Run = jest.fn();
    const local2Run = jest.fn();
    const global2ShouldRun = jest.fn(() => false);
    const local2ShouldRun = jest.fn(async () => false);

    const inputTasks: CoatManifestTaskStrict[] = [
      {
        id: "global1",
        type: CoatTaskType.Global,
        run: global1Run,
      },
      {
        id: "local1",
        type: CoatTaskType.Local,
        run: local1Run,
      },
      {
        id: "global2",
        type: CoatTaskType.Global,
        run: global2Run,
        shouldRun: global2ShouldRun,
      },
      {
        id: "local2",
        type: CoatTaskType.Local,
        run: local2Run,
        shouldRun: local2ShouldRun,
      },
    ];
    const context = {
      ...testContext,
      // Add previous task results to lockfile to
      // ensure getTasksToRun returns them anyways
      coatGlobalLockfile: getStrictCoatGlobalLockfile({
        version: 1,
        setup: {
          global1: {
            a: true,
          },
        },
      }),
      coatLocalLockfile: getStrictCoatLocalLockfile({
        version: 1,
        setup: {
          local1: {
            b: true,
          },
        },
      }),
    };
    await expect(getTasksToRun(inputTasks, context, true)).resolves.toEqual(
      inputTasks
    );

    expect(global2ShouldRun).not.toHaveBeenCalled();
    expect(local2ShouldRun).not.toHaveBeenCalled();
  });

  test("should work with an asynchronous shouldRun function", async () => {
    const global1Run = jest.fn();
    const local1Run = jest.fn();
    const global1ShouldRun = jest.fn(async () => true);
    const local1ShouldRun = jest.fn(async () => false);

    const inputTasks: CoatManifestTaskStrict[] = [
      {
        id: "global1",
        type: CoatTaskType.Global,
        run: global1Run,
        shouldRun: global1ShouldRun,
      },
      {
        id: "local1",
        type: CoatTaskType.Local,
        run: local1Run,
        shouldRun: local1ShouldRun,
      },
    ];
    await expect(
      getTasksToRun(inputTasks, testContext, false)
    ).resolves.toEqual(inputTasks.slice(0, 1));

    expect(global1ShouldRun).toHaveBeenCalledTimes(1);
    expect(local1ShouldRun).toHaveBeenCalledTimes(1);
  });

  test("should call shouldRun function with previous task results", async () => {
    const global1Run = jest.fn();
    const local1Run = jest.fn();
    const global1ShouldRun = jest.fn<Promise<boolean>, [CoatTaskRunOptions]>(
      async () => true
    );
    const local1ShouldRun = jest.fn<Promise<boolean>, [CoatTaskRunOptions]>(
      async () => false
    );
    const global2Run = jest.fn();
    const local2Run = jest.fn();
    const global2ShouldRun = jest.fn<Promise<boolean>, [CoatTaskRunOptions]>(
      async () => true
    );
    const local2ShouldRun = jest.fn<Promise<boolean>, [CoatTaskRunOptions]>(
      async () => false
    );

    const inputTasks: CoatManifestTaskStrict[] = [
      {
        id: "global1",
        type: CoatTaskType.Global,
        run: global1Run,
        shouldRun: global1ShouldRun,
      },
      {
        id: "local1",
        type: CoatTaskType.Local,
        run: local1Run,
        shouldRun: local1ShouldRun,
      },
      {
        id: "global2",
        type: CoatTaskType.Global,
        run: global2Run,
        shouldRun: global2ShouldRun,
      },
      {
        id: "local2",
        type: CoatTaskType.Local,
        run: local2Run,
        shouldRun: local2ShouldRun,
      },
    ];
    // Add task results for global1 and local1 tasks
    const context: CoatContext = {
      ...testContext,
      coatGlobalLockfile: getStrictCoatGlobalLockfile({
        version: 1,
        setup: {
          global1: {
            testyGlobal: true,
          },
        },
      }),
      coatLocalLockfile: getStrictCoatLocalLockfile({
        version: 1,
        setup: {
          local1: {
            testyLocal: true,
          },
        },
      }),
    };
    await expect(getTasksToRun(inputTasks, context, false)).resolves.toEqual([
      inputTasks[0],
      inputTasks[2],
    ]);

    expect(global1ShouldRun).toHaveBeenCalledTimes(1);
    expect(local1ShouldRun).toHaveBeenCalledTimes(1);
    expect(global2ShouldRun).toHaveBeenCalledTimes(1);
    expect(local2ShouldRun).toHaveBeenCalledTimes(1);

    expect(global1ShouldRun).toHaveBeenLastCalledWith({
      context,
      previousResults: {
        global: {
          global1: {
            testyGlobal: true,
          },
        },
        local: {
          local1: {
            testyLocal: true,
          },
        },
      },
    });

    expect(local1ShouldRun).toHaveBeenLastCalledWith({
      context,
      previousResults: {
        global: {
          global1: {
            testyGlobal: true,
          },
        },
        local: {
          local1: {
            testyLocal: true,
          },
        },
      },
    });

    expect(global2ShouldRun).toHaveBeenLastCalledWith({
      context,
      previousResults: {
        global: {
          global1: {
            testyGlobal: true,
          },
        },
        local: {
          local1: {
            testyLocal: true,
          },
        },
      },
    });

    expect(local2ShouldRun).toHaveBeenLastCalledWith({
      context,
      previousResults: {
        global: {
          global1: {
            testyGlobal: true,
          },
        },
        local: {
          local1: {
            testyLocal: true,
          },
        },
      },
    });
  });

  test("should include tasks without shouldRun property if no previous result available", async () => {
    const global1Run = jest.fn();
    const local1Run = jest.fn();

    const inputTasks: CoatManifestTaskStrict[] = [
      {
        id: "global1",
        type: CoatTaskType.Global,
        run: global1Run,
      },
      {
        id: "local1",
        type: CoatTaskType.Local,
        run: local1Run,
      },
    ];
    await expect(
      getTasksToRun(inputTasks, testContext, false)
    ).resolves.toEqual(inputTasks);
  });

  test("should not include tasks without shouldRun property if previous result available", async () => {
    const global1Run = jest.fn();
    const local1Run = jest.fn();
    const global2Run = jest.fn();
    const local2Run = jest.fn();

    const inputTasks: CoatManifestTaskStrict[] = [
      {
        id: "global1",
        type: CoatTaskType.Global,
        run: global1Run,
      },
      {
        id: "local1",
        type: CoatTaskType.Local,
        run: local1Run,
      },
      {
        id: "global2",
        type: CoatTaskType.Global,
        run: global2Run,
      },
      {
        id: "local2",
        type: CoatTaskType.Local,
        run: local2Run,
      },
    ];
    // Add previous task results to context
    const context: CoatContext = {
      ...testContext,
      coatGlobalLockfile: getStrictCoatGlobalLockfile({
        version: 1,
        setup: {
          global1: { globalResult: true },
        },
      }),
      coatLocalLockfile: getStrictCoatLocalLockfile({
        version: 1,
        setup: {
          local1: {
            localResult: true,
          },
        },
      }),
    };
    await expect(getTasksToRun(inputTasks, context, false)).resolves.toEqual([
      inputTasks[2],
      inputTasks[3],
    ]);
  });
});
