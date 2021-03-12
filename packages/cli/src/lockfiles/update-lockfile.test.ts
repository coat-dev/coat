import {
  COAT_GLOBAL_LOCKFILE_VERSION,
  COAT_LOCAL_LOCKFILE_VERSION,
} from "../constants";
import {
  getStrictCoatGlobalLockfile,
  getStrictCoatLocalLockfile,
} from "./get-strict-coat-lockfiles";
import { updateGlobalLockfile, updateLocalLockfile } from "./update-lockfile";

describe("lockfiles/update-lockfile", () => {
  const baseGlobalLockfile = getStrictCoatGlobalLockfile({
    version: COAT_GLOBAL_LOCKFILE_VERSION,
  });
  const baseLocalLockfile = getStrictCoatLocalLockfile({
    version: COAT_LOCAL_LOCKFILE_VERSION,
  });

  describe("global", () => {
    test("should replace version property", () => {
      const newGlobalLockfile = {};
      const updatedLockfile = updateGlobalLockfile(
        {
          ...baseGlobalLockfile,
          version: 42,
        },
        newGlobalLockfile
      );
      expect(updatedLockfile).toHaveProperty("version", 1);
    });

    test("should merge setup task results", () => {
      const currentLockfile = getStrictCoatGlobalLockfile({
        version: 1,
        setup: {
          oldTask1: {
            oldResult: false,
          },
        },
      });
      const newGlobalLockfile = getStrictCoatGlobalLockfile({
        version: 1,
        setup: {
          newTask1: {
            myResult: true,
          },
        },
      });

      const updatedLockfile = updateGlobalLockfile(
        currentLockfile,
        newGlobalLockfile
      );
      expect(updatedLockfile).toHaveProperty("setup", {
        oldTask1: {
          oldResult: false,
        },
        newTask1: {
          myResult: true,
        },
      });
    });

    test("should replace files array", () => {
      const currentLockfile = getStrictCoatGlobalLockfile({
        version: 1,
        files: [
          {
            path: "a.json",
            hash: "a.json-hash",
          },
          {
            path: "b.json",
            hash: "b.json-hash",
          },
        ],
      });
      const newGlobalLockfile = getStrictCoatGlobalLockfile({
        version: 1,
        files: [
          {
            path: "c.json",
            hash: "c.json-hash",
          },
        ],
      });
      const updatedLockfile = updateGlobalLockfile(
        currentLockfile,
        newGlobalLockfile
      );
      expect(updatedLockfile).toHaveProperty("files", [
        {
          path: "c.json",
          hash: "c.json-hash",
          once: false,
        },
      ]);
    });

    test("should not modify inputs", () => {
      const newGlobalLockfile = getStrictCoatGlobalLockfile({
        version: 1,
        setup: {
          task1: { prop: true },
        },
      });

      const oldGlobalLockfileCopy = JSON.parse(
        JSON.stringify(baseGlobalLockfile)
      );
      const newGlobalLockfileCopy = JSON.parse(
        JSON.stringify(newGlobalLockfile)
      );

      updateGlobalLockfile(baseGlobalLockfile, newGlobalLockfile);

      expect(baseGlobalLockfile).toEqual(oldGlobalLockfileCopy);
      expect(newGlobalLockfile).toEqual(newGlobalLockfileCopy);
    });
  });

  describe("local", () => {
    test("should replace version property", () => {
      const newLocalLockfile = {};
      const updatedLockfile = updateLocalLockfile(
        { ...baseLocalLockfile, version: 42 },
        newLocalLockfile
      );
      expect(updatedLockfile).toHaveProperty("version", 1);
    });

    test("should merge setup task results", () => {
      const currentLockfile = getStrictCoatLocalLockfile({
        version: 1,
        setup: {
          oldTask1: {
            oldResult: false,
          },
        },
      });

      const newLocalLockfile = getStrictCoatLocalLockfile({
        version: 1,
        setup: {
          newTask1: {
            myResult: true,
          },
        },
      });

      const updatedLockfile = updateLocalLockfile(
        currentLockfile,
        newLocalLockfile
      );

      expect(updatedLockfile).toHaveProperty("setup", {
        oldTask1: {
          oldResult: false,
        },
        newTask1: {
          myResult: true,
        },
      });
    });

    test("should replace files array", () => {
      const currentLockfile = getStrictCoatLocalLockfile({
        version: 1,
        files: [
          {
            path: "a.json",
            hash: "a.json-hash",
          },
          {
            path: "b.json",
            hash: "b.json-hash",
          },
        ],
      });

      const newLocalLockfile = getStrictCoatLocalLockfile({
        version: 1,
        files: [
          {
            path: "c.json",
            hash: "c.json-hash",
          },
        ],
      });

      const updatedLockfile = updateLocalLockfile(
        currentLockfile,
        newLocalLockfile
      );

      expect(updatedLockfile).toHaveProperty("files", [
        {
          path: "c.json",
          hash: "c.json-hash",
          once: false,
        },
      ]);
    });

    test("should not modify inputs", () => {
      const newLocalLockfile = getStrictCoatLocalLockfile({
        version: 1,
        setup: {
          task1: { prop: true },
        },
      });

      const oldLocalLockfileCopy = JSON.parse(
        JSON.stringify(baseLocalLockfile)
      );
      const newLocalLockfileCopy = JSON.parse(JSON.stringify(newLocalLockfile));

      updateLocalLockfile(baseLocalLockfile, newLocalLockfile);

      expect(baseLocalLockfile).toEqual(oldLocalLockfileCopy);
      expect(newLocalLockfile).toEqual(newLocalLockfileCopy);
    });
  });
});
