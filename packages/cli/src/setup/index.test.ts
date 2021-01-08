import fs from "fs-extra";
import path from "path";
import { vol } from "memfs";
import yaml from "js-yaml";
import { setup } from ".";
import {
  COAT_GLOBAL_LOCKFILE_PATH,
  COAT_GLOBAL_LOCKFILE_VERSION,
  COAT_LOCAL_LOCKFILE_PATH,
  COAT_LOCAL_LOCKFILE_VERSION,
  COAT_MANIFEST_FILENAME,
  PACKAGE_JSON_FILENAME,
} from "../constants";
import {
  getStrictCoatGlobalLockfile,
  getStrictCoatLocalLockfile,
} from "../lockfiles/get-strict-coat-lockfiles";
import { CoatContext } from "../types/coat-context";
import { getStrictCoatManifest } from "../util/get-strict-coat-manifest";
import * as getContextImport from "../util/get-context";
import * as getAllTemplatesImport from "../util/get-all-templates";
import * as getTasksToRunImport from "./get-tasks-to-run";
import { CoatTaskRunOptions } from "../types/coat-manifest-tasks";

jest.mock("fs");

const platformRoot = path.parse(process.cwd()).root;
const testCwd = path.join(platformRoot, "test");

describe("setup", () => {
  let getContextSpy: jest.SpyInstance;
  let getAllTemplatesSpy: jest.SpyInstance;
  let getTasksToRunSpy: jest.SpyInstance;

  beforeEach(async () => {
    // Prepare coat files in test cwd
    await Promise.all([
      fs.outputFile(
        path.join(testCwd, COAT_MANIFEST_FILENAME),
        JSON.stringify({ name: "test" })
      ),
      fs.outputFile(
        path.join(testCwd, PACKAGE_JSON_FILENAME),
        JSON.stringify({})
      ),
    ]);

    getContextSpy = jest.spyOn(getContextImport, "getContext");
    getAllTemplatesSpy = jest.spyOn(getAllTemplatesImport, "getAllTemplates");
    getTasksToRunSpy = jest.spyOn(getTasksToRunImport, "getTasksToRun");
  });

  afterEach(() => {
    vol.reset();
    jest.restoreAllMocks();
  });

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

  test("should load context", async () => {
    await setup(testCwd, false);

    expect(getContextSpy).toHaveBeenCalledTimes(1);
    expect(getContextSpy).toHaveBeenLastCalledWith(testCwd);
  });

  test("should load all templates", async () => {
    await setup(testCwd, false);

    expect(getAllTemplatesSpy).toHaveBeenCalledTimes(1);
    expect(getAllTemplatesSpy).toHaveBeenLastCalledWith(testContext);
  });

  test("should call getTasksToRun with force = false if force is set to false", async () => {
    await setup(testCwd, false);

    expect(getTasksToRunSpy).toHaveBeenCalledTimes(1);
    expect(getTasksToRunSpy).toHaveBeenLastCalledWith([], testContext, false);
  });

  test("should call getTasksToRun with force = true if force is set to true", async () => {
    await setup(testCwd, true);

    expect(getTasksToRunSpy).toHaveBeenCalledTimes(1);
    expect(getTasksToRunSpy).toHaveBeenLastCalledWith([], testContext, true);
  });

  test("should run tasks with context and previous results", async () => {
    const globalTaskRun = jest.fn();
    const localTaskRun = jest.fn();

    const context: CoatContext = {
      ...testContext,
      coatManifest: {
        ...testContext.coatManifest,
        setup: [
          {
            id: "globalTask",
            run: globalTaskRun,
          },
          {
            id: "localTask",
            run: localTaskRun,
            local: true,
          },
        ],
      },
      coatGlobalLockfile: getStrictCoatGlobalLockfile({
        version: 1,
        setup: {
          globalTask: {
            globalResult: true,
          },
        },
      }),
      coatLocalLockfile: getStrictCoatLocalLockfile({
        version: 1,
        setup: {
          localTask: {
            localResult: true,
          },
        },
      }),
    };
    getContextSpy.mockImplementationOnce(() => context);
    await setup(testCwd, true);

    expect(globalTaskRun).toHaveBeenCalledTimes(1);
    expect(globalTaskRun).toHaveBeenLastCalledWith({
      context,
      previousResults: {
        global: context.coatGlobalLockfile.setup,
        local: context.coatLocalLockfile.setup,
      },
    });

    expect(localTaskRun).toHaveBeenCalledTimes(1);
    expect(localTaskRun).toHaveBeenLastCalledWith({
      context,
      previousResults: {
        global: context.coatGlobalLockfile.setup,
        local: context.coatLocalLockfile.setup,
      },
    });
  });

  test("should run tasks with context and no previous results on first run", async () => {
    const globalTaskRun = jest.fn<Record<string, never>, [CoatTaskRunOptions]>(
      () => ({})
    );
    const localTaskRun = jest.fn<Record<string, never>, [CoatTaskRunOptions]>(
      () => ({})
    );

    const context: CoatContext = {
      ...testContext,
      coatManifest: {
        ...testContext.coatManifest,
        setup: [
          {
            id: "globalTask",
            run: globalTaskRun,
          },
          {
            id: "localTask",
            run: localTaskRun,
            local: true,
          },
        ],
      },
    };
    getContextSpy.mockImplementationOnce(() => context);
    await setup(testCwd, false);

    expect(globalTaskRun).toHaveBeenCalledTimes(1);
    expect(globalTaskRun).toHaveBeenLastCalledWith({
      context,
      previousResults: {
        global: {},
        local: {},
      },
    });

    expect(localTaskRun).toHaveBeenCalledTimes(1);
    expect(localTaskRun).toHaveBeenLastCalledWith({
      context: {
        ...context,
        coatGlobalLockfile: {
          ...context.coatGlobalLockfile,
          setup: {
            globalTask: {},
          },
        },
      },
      previousResults: {
        global: {
          globalTask: {},
        },
        local: {},
      },
    });
  });

  test("should not run tasks if there are previous results and force is false", async () => {
    const globalTaskRun = jest.fn(() => ({}));
    const localTaskRun = jest.fn(() => ({}));

    const context: CoatContext = {
      ...testContext,
      coatManifest: {
        ...testContext.coatManifest,
        setup: [
          {
            id: "globalTask",
            run: globalTaskRun,
          },
          {
            id: "localTask",
            run: localTaskRun,
            local: true,
          },
        ],
      },
      coatGlobalLockfile: getStrictCoatGlobalLockfile({
        version: 1,
        setup: {
          globalTask: {
            globalResult: true,
          },
        },
      }),
      coatLocalLockfile: getStrictCoatLocalLockfile({
        version: 1,
        setup: {
          localTask: {
            localResult: true,
          },
        },
      }),
    };
    getContextSpy.mockImplementationOnce(() => context);
    await setup(testCwd, false);

    expect(globalTaskRun).not.toHaveBeenCalled();
    expect(localTaskRun).not.toHaveBeenCalled();
  });

  test("should update lockfiles with task results", async () => {
    const globalTaskRun = jest.fn(() => ({ globalResult: true }));
    const localTaskRun = jest.fn(() => ({ localResult: true }));

    const context: CoatContext = {
      ...testContext,
      coatManifest: {
        ...testContext.coatManifest,
        setup: [
          {
            id: "globalTask",
            run: globalTaskRun,
          },
          {
            id: "localTask",
            run: localTaskRun,
            local: true,
          },
        ],
      },
    };
    getContextSpy.mockImplementationOnce(() => context);
    const newContext = await setup(testCwd, false);

    expect(newContext.coatGlobalLockfile).toHaveProperty("setup", {
      globalTask: { globalResult: true },
    });
    expect(newContext.coatLocalLockfile).toHaveProperty("setup", {
      localTask: { localResult: true },
    });

    const [globalLockfileOnDisk, localLockfileOnDisk] = await Promise.all([
      fs.readFile(path.join(testCwd, COAT_GLOBAL_LOCKFILE_PATH), "utf-8"),
      fs.readFile(path.join(testCwd, COAT_LOCAL_LOCKFILE_PATH), "utf-8"),
    ]);

    expect(yaml.load(globalLockfileOnDisk)).toEqual({
      version: 1,
      setup: {
        globalTask: {
          globalResult: true,
        },
      },
    });
    expect(yaml.load(localLockfileOnDisk)).toEqual({
      version: 1,
      setup: {
        localTask: {
          localResult: true,
        },
      },
    });
  });

  test("should store task results in between running tasks, even if there is an error in a task", async () => {
    const globalTaskRun1 = jest.fn(() => ({ globalResult: true }));
    const globalTaskRun2 = jest.fn(() => {
      throw new Error("Error in globalTask2");
    });

    const context: CoatContext = {
      ...testContext,
      coatManifest: {
        ...testContext.coatManifest,
        setup: [
          {
            id: "globalTask1",
            run: globalTaskRun1,
          },
          {
            id: "globalTask2",
            run: globalTaskRun2,
          },
        ],
      },
    };
    getContextSpy.mockImplementationOnce(() => context);
    await expect(() => setup(testCwd, false)).rejects.toMatchInlineSnapshot(
      `[Error: Error in globalTask2]`
    );

    const globalLockfileOnDisk = await fs.readFile(
      path.join(testCwd, COAT_GLOBAL_LOCKFILE_PATH),
      "utf-8"
    );

    expect(yaml.load(globalLockfileOnDisk)).toEqual({
      version: 1,
      setup: {
        globalTask1: {
          globalResult: true,
        },
      },
    });
  });

  test("should remove old task results from the lockfiles", async () => {
    const globalTaskRun = jest.fn(() => ({ globalResult: true }));
    const localTaskRun = jest.fn(() => ({ localResult: true }));

    const globalLockfile = getStrictCoatGlobalLockfile({
      version: COAT_GLOBAL_LOCKFILE_VERSION,
      setup: {
        oldGlobalTask: { globalResult: true },
      },
    });
    const localLockfile = getStrictCoatLocalLockfile({
      version: COAT_LOCAL_LOCKFILE_VERSION,
      setup: {
        oldLocalTask: { localResult: true },
      },
    });
    await Promise.all([
      fs.outputFile(
        path.join(testCwd, COAT_GLOBAL_LOCKFILE_PATH),
        yaml.dump(globalLockfile)
      ),
      fs.outputFile(
        path.join(testCwd, COAT_LOCAL_LOCKFILE_PATH),
        yaml.dump(localLockfile)
      ),
    ]);

    const context: CoatContext = {
      ...testContext,
      coatManifest: {
        ...testContext.coatManifest,
        setup: [
          {
            id: "globalTask",
            run: globalTaskRun,
          },
          {
            id: "localTask",
            run: localTaskRun,
            local: true,
          },
        ],
      },
      coatGlobalLockfile: globalLockfile,
      coatLocalLockfile: localLockfile,
    };

    getContextSpy.mockImplementationOnce(() => context);
    await setup(testCwd, false);

    const [globalLockfileOnDisk, localLockfileOnDisk] = await Promise.all([
      fs.readFile(path.join(testCwd, COAT_GLOBAL_LOCKFILE_PATH), "utf-8"),
      fs.readFile(path.join(testCwd, COAT_LOCAL_LOCKFILE_PATH), "utf-8"),
    ]);

    expect(yaml.load(globalLockfileOnDisk)).toEqual({
      version: 1,
      setup: {
        globalTask: {
          globalResult: true,
        },
      },
    });
    expect(yaml.load(localLockfileOnDisk)).toEqual({
      version: 1,
      setup: {
        localTask: {
          localResult: true,
        },
      },
    });
  });

  test("should keep managed task results in lockfile although they have not been run", async () => {
    const globalTaskRun1 = jest.fn(() => ({ globalResult1: true }));
    const localTaskRun1 = jest.fn(() => ({ localResult1: true }));
    const globalTaskRun2 = jest.fn(() => ({ globalResult2: true }));
    const localTaskRun2 = jest.fn(() => ({ localResult2: true }));

    const globalLockfile = getStrictCoatGlobalLockfile({
      version: COAT_GLOBAL_LOCKFILE_VERSION,
      setup: {
        globalTask1: { globalResult1: true },
      },
    });
    const localLockfile = getStrictCoatLocalLockfile({
      version: COAT_LOCAL_LOCKFILE_VERSION,
      setup: {
        localTask1: { localResult1: true },
      },
    });
    await Promise.all([
      fs.outputFile(
        path.join(testCwd, COAT_GLOBAL_LOCKFILE_PATH),
        yaml.dump(globalLockfile)
      ),
      fs.outputFile(
        path.join(testCwd, COAT_LOCAL_LOCKFILE_PATH),
        yaml.dump(localLockfile)
      ),
    ]);

    const context: CoatContext = {
      ...testContext,
      coatManifest: {
        ...testContext.coatManifest,
        setup: [
          {
            id: "globalTask1",
            run: globalTaskRun1,
          },
          {
            id: "localTask1",
            run: localTaskRun1,
            local: true,
          },
          {
            id: "globalTask2",
            run: globalTaskRun2,
          },
          {
            id: "localTask2",
            run: localTaskRun2,
            local: true,
          },
        ],
      },
      coatGlobalLockfile: globalLockfile,
      coatLocalLockfile: localLockfile,
    };

    getContextSpy.mockImplementationOnce(() => context);
    await setup(testCwd, false);

    const [globalLockfileOnDisk, localLockfileOnDisk] = await Promise.all([
      fs.readFile(path.join(testCwd, COAT_GLOBAL_LOCKFILE_PATH), "utf-8"),
      fs.readFile(path.join(testCwd, COAT_LOCAL_LOCKFILE_PATH), "utf-8"),
    ]);

    expect(yaml.load(globalLockfileOnDisk)).toEqual({
      version: 1,
      setup: {
        globalTask1: {
          globalResult1: true,
        },
        globalTask2: {
          globalResult2: true,
        },
      },
    });
    expect(yaml.load(localLockfileOnDisk)).toEqual({
      version: 1,
      setup: {
        localTask1: {
          localResult1: true,
        },
        localTask2: {
          localResult2: true,
        },
      },
    });
  });

  test("should work with tasks that don't return any result", async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const globalTaskRun = jest.fn((_options: CoatTaskRunOptions) => {
      // Empty function
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const localTaskRun = jest.fn((_options: CoatTaskRunOptions) => {
      // Empty function
    });

    const context: CoatContext = {
      ...testContext,
      coatManifest: {
        ...testContext.coatManifest,
        setup: [
          {
            id: "globalTask",
            run: globalTaskRun,
          },
          {
            id: "localTask",
            run: localTaskRun,
            local: true,
          },
        ],
      },
    };
    getContextSpy.mockImplementationOnce(() => context);
    await setup(testCwd, false);

    expect(globalTaskRun).toHaveBeenCalledTimes(1);
    expect(globalTaskRun).toHaveBeenLastCalledWith({
      context,
      previousResults: {
        global: {},
        local: {},
      },
    });

    expect(localTaskRun).toHaveBeenCalledTimes(1);
    expect(localTaskRun).toHaveBeenLastCalledWith({
      context: {
        ...context,
        coatGlobalLockfile: {
          ...context.coatGlobalLockfile,
          setup: {
            globalTask: {},
          },
        },
      },
      previousResults: {
        global: {
          globalTask: {},
        },
        local: {},
      },
    });
  });
});
