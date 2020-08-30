import { CoatGlobalLockfile, CoatLocalLockfile } from "../types/coat-lockfiles";
import {
  getStrictCoatGlobalLockfile,
  getStrictCoatLocalLockfile,
} from "./get-strict-coat-lockfiles";

describe("lockfiles/get-strict-coat-lockfiles", () => {
  describe("global", () => {
    test("should retrieve version from lockfile input", () => {
      const input: CoatGlobalLockfile = {
        version: 150,
      };
      const result = getStrictCoatGlobalLockfile(input);
      expect(result).toHaveProperty("version", 150);
    });

    test("should generate an empty files array without input files", () => {
      const input: CoatGlobalLockfile = {
        version: 1,
      };
      const result = getStrictCoatGlobalLockfile(input);
      expect(result).toHaveProperty("files", []);
    });

    test("should use files array from input", () => {
      const input: CoatGlobalLockfile = {
        version: 1,
        files: [
          {
            path: "a.json",
            once: true,
          },
        ],
      };
      const result = getStrictCoatGlobalLockfile(input);
      expect(result).toHaveProperty("files", [{ path: "a.json", once: true }]);
    });

    test("should set once property for all files", () => {
      const input: CoatGlobalLockfile = {
        version: 1,
        files: [
          {
            path: "a.json",
            once: true,
          },
          {
            path: "b.json",
            once: false,
          },
          {
            path: "c.json",
          },
        ],
      };
      const result = getStrictCoatGlobalLockfile(input);
      expect(result).toHaveProperty("files", [
        {
          path: "a.json",
          once: true,
        },
        {
          path: "b.json",
          once: false,
        },
        {
          path: "c.json",
          once: false,
        },
      ]);
    });

    test("should generate an empty setup task result object without input property", () => {
      const input: CoatGlobalLockfile = {
        version: 1,
      };
      const result = getStrictCoatGlobalLockfile(input);
      expect(result).toHaveProperty("setup", {});
    });

    test("should work with an empty setup task result object", () => {
      const input: CoatGlobalLockfile = {
        version: 1,
        setup: {},
      };
      const result = getStrictCoatGlobalLockfile(input);
      expect(result).toHaveProperty("setup", {});
    });

    test("should use setup task results from input", () => {
      const input: CoatGlobalLockfile = {
        version: 1,
        setup: {
          task1: {
            hi: true,
          },
          task2: {
            b: null,
          },
        },
      };
      const result = getStrictCoatGlobalLockfile(input);
      expect(result).toHaveProperty("setup", {
        task1: {
          hi: true,
        },
        task2: {
          b: null,
        },
      });
    });
  });

  describe("local", () => {
    test("should retrieve version from lockfile input", () => {
      const input: CoatLocalLockfile = {
        version: 150,
      };
      const result = getStrictCoatLocalLockfile(input);
      expect(result).toHaveProperty("version", 150);
    });

    test("should generate an empty files array without input files", () => {
      const input: CoatLocalLockfile = {
        version: 1,
      };
      const result = getStrictCoatLocalLockfile(input);
      expect(result).toHaveProperty("files", []);
    });

    test("should use files array from input", () => {
      const input: CoatLocalLockfile = {
        version: 1,
        files: [
          {
            path: "a.json",
            once: true,
          },
        ],
      };
      const result = getStrictCoatLocalLockfile(input);
      expect(result).toHaveProperty("files", [{ path: "a.json", once: true }]);
    });

    test("should set once property for all files", () => {
      const input: CoatLocalLockfile = {
        version: 1,
        files: [
          {
            path: "a.json",
            once: true,
          },
          {
            path: "b.json",
            once: false,
          },
          {
            path: "c.json",
          },
        ],
      };
      const result = getStrictCoatLocalLockfile(input);
      expect(result).toHaveProperty("files", [
        {
          path: "a.json",
          once: true,
        },
        {
          path: "b.json",
          once: false,
        },
        {
          path: "c.json",
          once: false,
        },
      ]);
    });

    test("should generate an empty setup task result object without input property", () => {
      const input: CoatLocalLockfile = {
        version: 1,
      };
      const result = getStrictCoatLocalLockfile(input);
      expect(result).toHaveProperty("setup", {});
    });

    test("should work with an empty setup task result object", () => {
      const input: CoatLocalLockfile = {
        version: 1,
        setup: {},
      };
      const result = getStrictCoatLocalLockfile(input);
      expect(result).toHaveProperty("setup", {});
    });

    test("should use setup task results from input", () => {
      const input: CoatLocalLockfile = {
        version: 1,
        setup: {
          task1: {
            hi: true,
          },
          task2: {
            b: null,
          },
        },
      };
      const result = getStrictCoatLocalLockfile(input);
      expect(result).toHaveProperty("setup", {
        task1: {
          hi: true,
        },
        task2: {
          b: null,
        },
      });
    });
  });
});
