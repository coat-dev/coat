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
import {
  CoatManifestTaskStrict,
  CoatTaskRunOptions,
  CoatTaskType,
} from "../types/coat-manifest-tasks";
import stripAnsi from "strip-ansi";
import {
  getCoatGlobalLockfileValidator,
  getCoatLocalLockfileValidator,
} from "../util/get-validator";

jest.mock("fs").mock("../util/get-validator");

const getCoatGlobalLockfileValidatorMock = (getCoatGlobalLockfileValidator as unknown) as jest.Mock<
  ReturnType<typeof getCoatGlobalLockfileValidator>,
  Parameters<typeof getCoatGlobalLockfileValidator>
>;
getCoatGlobalLockfileValidatorMock.mockImplementation(async () => () => true);

const getCoatLocalLockfileValidatorMock = (getCoatLocalLockfileValidator as unknown) as jest.Mock<
  ReturnType<typeof getCoatLocalLockfileValidator>,
  Parameters<typeof getCoatLocalLockfileValidator>
>;
getCoatLocalLockfileValidatorMock.mockImplementation(async () => () => true);

const getContextSpy = jest.spyOn(getContextImport, "getContext");
const getAllTemplatesSpy = jest.spyOn(getAllTemplatesImport, "getAllTemplates");
const getTasksToRunSpy = jest.spyOn(getTasksToRunImport, "getTasksToRun");
const exitSpy = jest.spyOn(process, "exit").mockImplementation((): never => {
  throw new Error("process.exit");
});
const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {
  // Empty function
});

const platformRoot = path.parse(process.cwd()).root;
const testCwd = path.join(platformRoot, "test");

describe("setup", () => {
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
  });

  afterEach(() => {
    vol.reset();
    jest.clearAllMocks();
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
    await setup({ cwd: testCwd, force: false });

    expect(getContextSpy).toHaveBeenCalledTimes(1);
    expect(getContextSpy).toHaveBeenLastCalledWith(testCwd);
  });

  test("should load all templates", async () => {
    await setup({ cwd: testCwd, force: false });

    expect(getAllTemplatesSpy).toHaveBeenCalledTimes(1);
    expect(getAllTemplatesSpy).toHaveBeenLastCalledWith(testContext);
  });

  test("should call getTasksToRun with force = false if force is set to false", async () => {
    await setup({ cwd: testCwd, force: false });

    expect(getTasksToRunSpy).toHaveBeenCalledTimes(1);
    expect(getTasksToRunSpy).toHaveBeenLastCalledWith([], testContext, false);
  });

  test("should call getTasksToRun with force = true if force is set to true", async () => {
    await setup({ cwd: testCwd, force: true });

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
    getContextSpy.mockImplementationOnce(async () => context);
    await setup({ cwd: testCwd, force: true });

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
    getContextSpy.mockImplementationOnce(async () => context);
    await setup({ cwd: testCwd, force: false });

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
    getContextSpy.mockImplementationOnce(async () => context);
    await setup({ cwd: testCwd, force: false });

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
    getContextSpy.mockImplementationOnce(async () => context);
    const newContext = await setup({ cwd: testCwd, force: false });

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
    getContextSpy.mockImplementationOnce(async () => context);
    await expect(() =>
      setup({ cwd: testCwd, force: false })
    ).rejects.toMatchInlineSnapshot(`[Error: Error in globalTask2]`);

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

    getContextSpy.mockImplementationOnce(async () => context);
    await setup({ cwd: testCwd, force: false });

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

    getContextSpy.mockImplementationOnce(async () => context);
    await setup({ cwd: testCwd, force: false });

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
    getContextSpy.mockImplementationOnce(async () => context);
    await setup({ cwd: testCwd, force: false });

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

  describe("--check flag", () => {
    test("should exit successfully if coat project is up to date", async () => {
      await setup({ cwd: testCwd, check: true });
    });

    test("should exit successfully even if there are local tasks that need to be run", async () => {
      const tasks: CoatManifestTaskStrict[] = [
        {
          id: "test1",
          type: CoatTaskType.Local,
          run: jest.fn(),
        },
      ];

      getTasksToRunSpy.mockReturnValueOnce(Promise.resolve(tasks));
      await setup({ cwd: testCwd, check: true });
    });

    test("should exit successfully even if there are local lockfile updates pending", async () => {
      const context: CoatContext = {
        ...testContext,
        coatLocalLockfile: {
          ...testContext.coatLocalLockfile,
          setup: {
            previousTask: {},
          },
        },
      };
      getContextSpy.mockReturnValueOnce(Promise.resolve(context));

      await setup({ cwd: testCwd, check: true });
    });

    test("should not run any tasks", async () => {
      const run = jest.fn();
      const tasks: CoatManifestTaskStrict[] = [
        {
          id: "test1",
          type: CoatTaskType.Local,
          run,
        },
      ];
      getTasksToRunSpy.mockReturnValueOnce(Promise.resolve(tasks));

      await setup({ cwd: testCwd, check: true });

      expect(run).not.toHaveBeenCalled();
    });

    test("should not update local lockfile on disk", async () => {
      const context: CoatContext = {
        ...testContext,
        coatLocalLockfile: {
          ...testContext.coatLocalLockfile,
          setup: {
            previousLocalTask: {},
          },
        },
      };
      getContextSpy.mockReturnValueOnce(Promise.resolve(context));

      await setup({ cwd: testCwd, check: true });

      await expect(
        fs.readFile(path.join(testCwd, COAT_LOCAL_LOCKFILE_PATH))
      ).rejects.toHaveProperty(
        "message",
        expect.stringContaining("ENOENT: no such file or directory")
      );
    });

    test("should exit with error and log that there are pending global tasks", async () => {
      const run = jest.fn();
      const tasks: CoatManifestTaskStrict[] = [
        {
          id: "test1",
          type: CoatTaskType.Global,
          run,
        },
      ];
      getTasksToRunSpy.mockReturnValueOnce(Promise.resolve(tasks));

      await expect(setup({ cwd: testCwd, check: true })).rejects.toHaveProperty(
        "message",
        "process.exit"
      );

      expect(exitSpy).toHaveBeenCalledTimes(1);
      expect(exitSpy).toHaveBeenLastCalledWith(1);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(stripAnsi(consoleErrorSpy.mock.calls[0][0]))
        .toMatchInlineSnapshot(`
        "
        The coat project is not in sync.
        There are global tasks pending that need to be run to setup this coat project.

        Run coat sync to bring the project back in sync."
      `);
    });

    test("should exit with error if global lockfile has pending updates", async () => {
      const context: CoatContext = {
        ...testContext,
        coatGlobalLockfile: {
          ...testContext.coatGlobalLockfile,
          setup: {
            previousGlobalTask: {},
          },
        },
      };
      getContextSpy.mockReturnValueOnce(Promise.resolve(context));

      await expect(setup({ cwd: testCwd, check: true })).rejects.toHaveProperty(
        "message",
        "process.exit"
      );

      expect(exitSpy).toHaveBeenCalledTimes(1);
      expect(exitSpy).toHaveBeenLastCalledWith(1);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(stripAnsi(consoleErrorSpy.mock.calls[0][0]))
        .toMatchInlineSnapshot(`
        "
        The coat project is not in sync.
        The global lockfile (coat.lock) needs to be updated.

        Run coat sync to bring the project back in sync."
      `);
    });
  });
});
