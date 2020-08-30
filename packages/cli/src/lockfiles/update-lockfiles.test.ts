import {
  COAT_GLOBAL_LOCKFILE_VERSION,
  COAT_LOCAL_LOCKFILE_VERSION,
} from "../constants";
import { CoatContext } from "../types/coat-context";
import { getStrictCoatManifest } from "../util/get-strict-coat-manifest";
import {
  getStrictCoatGlobalLockfile,
  getStrictCoatLocalLockfile,
} from "./get-strict-coat-lockfiles";
import { updateLockfiles } from "./update-lockfiles";
import { writeGlobalLockfile, writeLocalLockfile } from "./write-lockfiles";

jest.mock("./write-lockfiles");

describe("lockfiles/update-lockfiles", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const context: CoatContext = {
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

  test("should work without local or global lockfile", async () => {
    const newContext = await updateLockfiles({ context });
    expect(context).toEqual(newContext);
  });

  test("should work with only a new local lockfile", async () => {
    const newLocalLockfile = getStrictCoatLocalLockfile({
      version: 1,
      setup: {
        task1: { prop: true },
      },
    });
    const newContext = await updateLockfiles({
      context,
      updatedLocalLockfile: newLocalLockfile,
    });
    expect(newContext.coatLocalLockfile).toEqual(newLocalLockfile);
  });

  test("should work with only a new global lockfile", async () => {
    const newGlobalLockfile = getStrictCoatGlobalLockfile({
      version: 1,
      setup: {
        task1: { prop: true },
      },
    });
    const newContext = await updateLockfiles({
      context,
      updatedGlobalLockfile: newGlobalLockfile,
    });
    expect(newContext.coatGlobalLockfile).toEqual(newGlobalLockfile);
  });

  test("should work with both a new local & global lockfile", async () => {
    const newLocalLockfile = getStrictCoatLocalLockfile({
      version: 1,
      setup: {
        task2: { prop: true },
      },
    });
    const newGlobalLockfile = getStrictCoatGlobalLockfile({
      version: 1,
      setup: {
        task1: { prop: true },
      },
    });
    const newContext = await updateLockfiles({
      context,
      updatedLocalLockfile: newLocalLockfile,
      updatedGlobalLockfile: newGlobalLockfile,
    });

    expect(newContext.coatLocalLockfile).toEqual(newLocalLockfile);
    expect(newContext.coatGlobalLockfile).toEqual(newGlobalLockfile);
  });

  test("should not modify input context when updating lockfiles", async () => {
    const contextCopy = JSON.parse(JSON.stringify(context));
    const newLocalLockfile = getStrictCoatLocalLockfile({
      version: 1,
      setup: {
        task2: { prop: true },
      },
    });
    const newGlobalLockfile = getStrictCoatGlobalLockfile({
      version: 1,
      setup: {
        task1: { prop: true },
      },
    });
    await updateLockfiles({
      context,
      updatedLocalLockfile: newLocalLockfile,
      updatedGlobalLockfile: newGlobalLockfile,
    });
    expect(context).toEqual(contextCopy);
  });

  describe("global", () => {
    test("should replace version property", async () => {
      const newGlobalLockfile = getStrictCoatGlobalLockfile({
        version: 42,
      });
      const newContext = await updateLockfiles({
        context,
        updatedGlobalLockfile: newGlobalLockfile,
      });
      expect(newContext.coatGlobalLockfile).toHaveProperty("version", 42);
    });

    test("should merge setup task results", async () => {
      const testContext = {
        ...context,
        coatGlobalLockfile: getStrictCoatGlobalLockfile({
          version: 1,
          setup: {
            oldTask1: {
              oldResult: false,
            },
          },
        }),
      };
      const newGlobalLockfile = getStrictCoatGlobalLockfile({
        version: 1,
        setup: {
          newTask1: {
            myResult: true,
          },
        },
      });
      const newContext = await updateLockfiles({
        context: testContext,
        updatedGlobalLockfile: newGlobalLockfile,
      });
      expect(newContext.coatGlobalLockfile).toHaveProperty("setup", {
        oldTask1: {
          oldResult: false,
        },
        newTask1: {
          myResult: true,
        },
      });
    });

    test("should replace files array", async () => {
      const testContext = {
        ...context,
        coatGlobalLockfile: getStrictCoatGlobalLockfile({
          version: 1,
          files: [
            {
              path: "a.json",
            },
            {
              path: "b.json",
            },
          ],
        }),
      };
      const newGlobalLockfile = getStrictCoatGlobalLockfile({
        version: 1,
        files: [
          {
            path: "c.json",
          },
        ],
      });
      const newContext = await updateLockfiles({
        context: testContext,
        updatedGlobalLockfile: newGlobalLockfile,
      });
      expect(newContext.coatGlobalLockfile).toHaveProperty("files", [
        {
          path: "c.json",
          once: false,
        },
      ]);
    });

    test("should call write local lockfile if lockfile is modified", async () => {
      const newGlobalLockfile = getStrictCoatGlobalLockfile({
        version: 1,
        files: [
          {
            path: "a.json",
          },
        ],
      });
      await updateLockfiles({
        context,
        updatedGlobalLockfile: newGlobalLockfile,
      });

      expect(writeGlobalLockfile).toHaveBeenCalledTimes(1);
      expect(writeGlobalLockfile).toHaveBeenLastCalledWith(
        newGlobalLockfile,
        context
      );
    });

    test("should not call write local lockfile if lockfile is unchanged", async () => {
      const newGlobalLockfile = getStrictCoatGlobalLockfile({
        version: 1,
        files: [],
      });
      await updateLockfiles({
        context,
        updatedGlobalLockfile: newGlobalLockfile,
      });

      expect(writeGlobalLockfile).not.toHaveBeenCalled();
    });
  });

  describe("local", () => {
    test("should replace version property", async () => {
      const newLocalLockfile = getStrictCoatLocalLockfile({
        version: 42,
      });
      const newContext = await updateLockfiles({
        context,
        updatedLocalLockfile: newLocalLockfile,
      });
      expect(newContext.coatLocalLockfile).toHaveProperty("version", 42);
    });

    test("should merge setup task results", async () => {
      const testContext = {
        ...context,
        coatLocalLockfile: getStrictCoatLocalLockfile({
          version: 1,
          setup: {
            oldTask1: {
              oldResult: false,
            },
          },
        }),
      };
      const newLocalLockfile = getStrictCoatLocalLockfile({
        version: 1,
        setup: {
          newTask1: {
            myResult: true,
          },
        },
      });
      const newContext = await updateLockfiles({
        context: testContext,
        updatedLocalLockfile: newLocalLockfile,
      });
      expect(newContext.coatLocalLockfile).toHaveProperty("setup", {
        oldTask1: {
          oldResult: false,
        },
        newTask1: {
          myResult: true,
        },
      });
    });

    test("should replace files array", async () => {
      const testContext = {
        ...context,
        coatGlobalLockfile: getStrictCoatLocalLockfile({
          version: 1,
          files: [
            {
              path: "a.json",
            },
            {
              path: "b.json",
            },
          ],
        }),
      };
      const newLocalLockfile = getStrictCoatLocalLockfile({
        version: 1,
        files: [
          {
            path: "c.json",
          },
        ],
      });
      const newContext = await updateLockfiles({
        context: testContext,
        updatedLocalLockfile: newLocalLockfile,
      });
      expect(newContext.coatLocalLockfile).toHaveProperty("files", [
        {
          path: "c.json",
          once: false,
        },
      ]);
    });

    test("should call write local lockfile if lockfile is modified", async () => {
      const newLocalLockfile = getStrictCoatLocalLockfile({
        version: 1,
        files: [
          {
            path: "a.json",
          },
        ],
      });
      await updateLockfiles({
        context,
        updatedLocalLockfile: newLocalLockfile,
      });

      expect(writeLocalLockfile).toHaveBeenCalledTimes(1);
      expect(writeLocalLockfile).toHaveBeenLastCalledWith(
        newLocalLockfile,
        context
      );
    });

    test("should not call write local lockfile if lockfile is unchanged", async () => {
      const newLocalLockfile = getStrictCoatLocalLockfile({
        version: 1,
        files: [],
      });
      await updateLockfiles({
        context,
        updatedLocalLockfile: newLocalLockfile,
      });

      expect(writeLocalLockfile).not.toHaveBeenCalled();
    });
  });
});
