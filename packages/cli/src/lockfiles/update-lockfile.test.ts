import {
  COAT_GLOBAL_LOCKFILE_VERSION,
  COAT_LOCAL_LOCKFILE_VERSION,
} from "../constants";
import {
  getStrictCoatGlobalLockfile,
  getStrictCoatLocalLockfile,
} from "./get-strict-coat-lockfiles";
import { updateLockfile } from "./update-lockfile";

describe("lockfiles/update-lockfile", () => {
  const baseGlobalLockfile = getStrictCoatGlobalLockfile({
    version: COAT_GLOBAL_LOCKFILE_VERSION,
  });
  const baseLocalLockfile = getStrictCoatLocalLockfile({
    version: COAT_LOCAL_LOCKFILE_VERSION,
  });

  describe("global", () => {
    test("should replace version property", () => {
      const newGlobalLockfile = getStrictCoatGlobalLockfile({
        version: 42,
      });
      const updatedLockfile = updateLockfile(
        baseGlobalLockfile,
        newGlobalLockfile
      );
      expect(updatedLockfile).toHaveProperty("version", 42);
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

      const updatedLockfile = updateLockfile(
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
      const updatedLockfile = updateLockfile(
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

      updateLockfile(baseGlobalLockfile, newGlobalLockfile);

      expect(baseGlobalLockfile).toEqual(oldGlobalLockfileCopy);
      expect(newGlobalLockfile).toEqual(newGlobalLockfileCopy);
    });
  });

  describe("local", () => {
    test("should replace version property", () => {
      const newLocalLockfile = getStrictCoatLocalLockfile({
        version: 42,
      });
      const updatedLockfile = updateLockfile(
        baseLocalLockfile,
        newLocalLockfile
      );
      expect(updatedLockfile).toHaveProperty("version", 42);
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

      const updatedLockfile = updateLockfile(currentLockfile, newLocalLockfile);

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

      const updatedLockfile = updateLockfile(currentLockfile, newLocalLockfile);

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

      updateLockfile(baseLocalLockfile, newLocalLockfile);

      expect(baseLocalLockfile).toEqual(oldLocalLockfileCopy);
      expect(newLocalLockfile).toEqual(newLocalLockfileCopy);
    });
  });
});
