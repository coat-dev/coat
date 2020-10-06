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
import { yamlFileFunctions } from "./yaml";

jest.mock("import-from");

const importFromSilentMock = importFrom.silent as jest.Mock;

describe("file-types/yaml", () => {
  describe("merge", () => {
    test("should deeply merge two objects", () => {
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
      expect(yamlFileFunctions.merge(source, target)).toEqual({
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
        na: {
          c: 1,
          a: 1,
        },
        a: 1,
      };
      const polished = yamlFileFunctions.polish(
        content,
        "name.yaml",
        testContext
      );
      expect(polished).toMatchInlineSnapshot(`
        "a: 1
        na:
          a: 1
          c: 1
        z: 1
        "
      `);
    });

    test("should format files with prettier with that have non-yaml extensions", () => {
      const content = {
        z: 1,
        b: {
          c: [1, 2],
        },
        a: 1,
      };
      const polished1 = yamlFileFunctions.polish(
        content,
        ".graphqlconfig",
        testContext
      );
      const polished2 = yamlFileFunctions.polish(
        content,
        "file.config",
        testContext
      );

      expect(polished1).toMatchInlineSnapshot(`
        "a: 1
        b:
          c:
            - 1
            - 2
        z: 1
        "
      `);
      expect(polished2).toMatchInlineSnapshot(`
        "a: 1
        b:
          c:
            - 1
            - 2
        z: 1
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
      const polished = yamlFileFunctions.polish(
        content,
        "file.yaml",
        testContext
      );
      expect(polished).toMatchInlineSnapshot(`"formatted"`);

      expect(formatSpy).toHaveBeenCalledTimes(1);
    });
  });
});
