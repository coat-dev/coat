import importFrom from "import-from";
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
import { jsonFileFunctions } from "./json";

jest.mock("import-from");

const importFromSilentMock = importFrom.silent as jest.Mock;

describe("file-types/json", () => {
  describe("merge", () => {
    test("should deeply merge two json objects", () => {
      const source = {
        a: true,
        b: {
          c: 1,
          e: [1, 2],
        },
      };
      const target = {
        d: true,
        b: {
          c: 5,
          e: [1, 3, 5],
        },
      };
      expect(jsonFileFunctions.merge(source, target)).toEqual({
        a: true,
        d: true,
        b: {
          c: 5,
          e: [1, 3, 5],
        },
      });
    });
  });

  describe("polish", () => {
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

    test("should sort properties alphabetically", () => {
      const content = {
        z: 1,
        n: {
          c: 1,
          a: 1,
        },
        a: 1,
      };
      const polished = jsonFileFunctions.polish(
        content,
        "name.json",
        testContext
      );
      expect(polished).toMatchInlineSnapshot(`
        "{
          \\"a\\": 1,
          \\"n\\": {
            \\"a\\": 1,
            \\"c\\": 1
          },
          \\"z\\": 1
        }
        "
      `);
    });

    test("should place top-level name and version properties at the top of the json output", () => {
      const content = {
        z: 1,
        name: "name",
        n: {
          c: 1,
          a: 1,
        },
        version: "1.0.0",
        a: 1,
      };
      const polished = jsonFileFunctions.polish(
        content,
        "name.json",
        testContext
      );
      expect(polished).toMatchInlineSnapshot(`
        "{
          \\"name\\": \\"name\\",
          \\"version\\": \\"1.0.0\\",
          \\"a\\": 1,
          \\"n\\": {
            \\"a\\": 1,
            \\"c\\": 1
          },
          \\"z\\": 1
        }
        "
      `);
    });

    test("should sort deeper name and version properties alphabetically", () => {
      const content = {
        z: 1,
        name: "name",
        n: {
          c: 1,
          name: "deep-name",
          deep: {
            "deep-a": 1,
            version: "deeper-version",
          },
          a: 1,
        },
        version: "1.0.0",
        a: 1,
      };
      const polished = jsonFileFunctions.polish(
        content,
        "name.json",
        testContext
      );
      expect(polished).toMatchInlineSnapshot(`
        "{
          \\"name\\": \\"name\\",
          \\"version\\": \\"1.0.0\\",
          \\"a\\": 1,
          \\"n\\": {
            \\"a\\": 1,
            \\"c\\": 1,
            \\"deep\\": {
              \\"deep-a\\": 1,
              \\"version\\": \\"deeper-version\\"
            },
            \\"name\\": \\"deep-name\\"
          },
          \\"z\\": 1
        }
        "
      `);
    });

    test("should place top-level name property without version at the top of the json output", () => {
      const content = {
        z: 1,
        n: {
          c: 1,
          a: 1,
        },
        name: "name",
        a: 1,
      };
      const polished = jsonFileFunctions.polish(
        content,
        "name.json",
        testContext
      );
      expect(polished).toMatchInlineSnapshot(`
        "{
          \\"name\\": \\"name\\",
          \\"a\\": 1,
          \\"n\\": {
            \\"a\\": 1,
            \\"c\\": 1
          },
          \\"z\\": 1
        }
        "
      `);
    });

    test("should place top-level version property without name at the top of the json output", () => {
      const content = {
        z: 1,
        version: "1.0.0",
        n: {
          c: 1,
          a: 1,
        },
        a: 1,
      };
      const polished = jsonFileFunctions.polish(
        content,
        "name.json",
        testContext
      );
      expect(polished).toMatchInlineSnapshot(`
        "{
          \\"version\\": \\"1.0.0\\",
          \\"a\\": 1,
          \\"n\\": {
            \\"a\\": 1,
            \\"c\\": 1
          },
          \\"z\\": 1
        }
        "
      `);
    });

    test("should format files with prettier with that have non-json extensions", () => {
      const content = {
        z: 1,
        b: {
          c: [1, 2],
        },
        a: 1,
      };
      const polished1 = jsonFileFunctions.polish(
        content,
        ".babelrc",
        testContext
      );
      const polished2 = jsonFileFunctions.polish(
        content,
        "file.config",
        testContext
      );

      expect(polished1).toMatchInlineSnapshot(`
        "{
          \\"a\\": 1,
          \\"b\\": {
            \\"c\\": [1, 2]
          },
          \\"z\\": 1
        }
        "
      `);
      expect(polished2).toMatchInlineSnapshot(`
        "{
          \\"a\\": 1,
          \\"b\\": {
            \\"c\\": [1, 2]
          },
          \\"z\\": 1
        }
        "
      `);
    });

    test("should use local prettier version if available", () => {
      const content = {
        a: 1,
      };
      const formatSpy = jest.fn(() => "formatted");
      importFromSilentMock.mockImplementationOnce(() => ({
        getFileInfo: {
          sync: () => ({}),
        },
        format: formatSpy,
      }));
      const polished = jsonFileFunctions.polish(
        content,
        "file.json",
        testContext
      );
      expect(polished).toMatchInlineSnapshot(`"formatted"`);

      expect(formatSpy).toHaveBeenCalledTimes(1);
    });
  });
});
