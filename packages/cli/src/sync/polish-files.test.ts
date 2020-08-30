import importFrom from "import-from";
import { polishFiles } from "./polish-files";
import { CoatManifestFileType } from "../types/coat-manifest-file";
import { CoatContext } from "../types/coat-context";
import { getStrictCoatManifest } from "../util/get-strict-coat-manifest";

jest.mock("import-from");

const importFromSilentMock = importFrom.silent as jest.Mock;

describe("sync/polish-files", () => {
  const testContext: CoatContext = {
    cwd: "test-cwd",
    coatManifest: getStrictCoatManifest({
      name: "test",
    }),
    packageJson: {},
    coatLockfile: undefined,
  };

  test("should throw an error for unknown file types", () => {
    expect(() =>
      polishFiles(
        [
          {
            // @ts-expect-error
            type: "UNKNOWN",
            content: { asta: "1,2,3" },
            file: "filename.unknown",
          },
        ],
        testContext
      )
    ).toThrowErrorMatchingInlineSnapshot(
      `"Unknown file type in polish: UNKNOWN"`
    );
  });

  describe("json", () => {
    test("should sort properties alphabetically", () => {
      const content = {
        z: 1,
        n: {
          c: 1,
          a: 1,
        },
        a: 1,
      };
      const polished = polishFiles(
        [
          {
            content,
            type: CoatManifestFileType.Json,
            file: "name.json",
          },
        ],
        testContext
      );
      expect(polished[0].content).toMatchInlineSnapshot(`
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
      const polished = polishFiles(
        [
          {
            content,
            type: CoatManifestFileType.Json,
            file: "name.json",
          },
        ],
        testContext
      );
      expect(polished[0].content).toMatchInlineSnapshot(`
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
      const polished = polishFiles(
        [
          {
            content,
            type: CoatManifestFileType.Json,
            file: "name.json",
          },
        ],
        testContext
      );
      expect(polished[0].content).toMatchInlineSnapshot(`
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
      const polished = polishFiles(
        [
          {
            content,
            type: CoatManifestFileType.Json,
            file: "name.json",
          },
        ],
        testContext
      );
      expect(polished[0].content).toMatchInlineSnapshot(`
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
      const polished = polishFiles(
        [
          {
            content,
            type: CoatManifestFileType.Json,
            file: "name.json",
          },
        ],
        testContext
      );
      expect(polished[0].content).toMatchInlineSnapshot(`
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
      const polished = polishFiles(
        [
          {
            content,
            type: CoatManifestFileType.Json,
            file: ".babelrc",
          },
          {
            content,
            type: CoatManifestFileType.Json,
            file: "file.config",
          },
        ],
        testContext
      );

      expect(polished[0].content).toMatchInlineSnapshot(`
        "{
          \\"a\\": 1,
          \\"b\\": {
            \\"c\\": [1, 2]
          },
          \\"z\\": 1
        }
        "
      `);
      expect(polished[1].content).toMatchInlineSnapshot(`
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
        format: formatSpy,
      }));
      const polished = polishFiles(
        [
          {
            content,
            file: "file.json",
            type: CoatManifestFileType.Json,
          },
        ],
        testContext
      );
      expect(polished[0].content).toMatchInlineSnapshot(`"formatted"`);

      expect(formatSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("text", () => {
    test("should add trailing new line if text ends without new line", () => {
      const content = "Text content";
      const polished = polishFiles(
        [
          {
            content,
            file: "file.txt",
            type: CoatManifestFileType.Text,
          },
        ],
        testContext
      );
      expect(polished[0].content).toMatchInlineSnapshot(`
        "Text content
        "
      `);
    });

    test("should leave text unchanged if text already ends with a single new trailing new line", () => {
      const content = "Text content\n";
      const polished = polishFiles(
        [
          {
            content,
            file: "file.txt",
            type: CoatManifestFileType.Text,
          },
        ],
        testContext
      );
      expect(content).toBe(polished[0].content);
      expect(polished[0].content).toMatchInlineSnapshot(`
        "Text content
        "
      `);
    });

    test("should merge multiple trailing new lines into single trailing new line", () => {
      const content = "Text content\n\n\n";
      const polished = polishFiles(
        [
          {
            content,
            file: "file.txt",
            type: CoatManifestFileType.Text,
          },
        ],
        testContext
      );
      expect(polished[0].content).toMatchInlineSnapshot(`
        "Text content
        "
      `);
    });
  });

  describe("yaml", () => {
    test("should sort properties alphabetically", () => {
      const content = {
        z: 1,
        na: {
          c: 1,
          a: 1,
        },
        a: 1,
      };
      const polished = polishFiles(
        [
          {
            content,
            type: CoatManifestFileType.Yaml,
            file: "name.yaml",
          },
        ],
        testContext
      );
      expect(polished[0].content).toMatchInlineSnapshot(`
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
      const polished = polishFiles(
        [
          {
            content,
            type: CoatManifestFileType.Yaml,
            file: ".graphqlconfig",
          },
          {
            content,
            type: CoatManifestFileType.Yaml,
            file: "file.config",
          },
        ],
        testContext
      );

      expect(polished[0].content).toMatchInlineSnapshot(`
        "a: 1
        b:
          c:
            - 1
            - 2
        z: 1
        "
      `);
      expect(polished[1].content).toMatchInlineSnapshot(`
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
        format: formatSpy,
      }));
      const polished = polishFiles(
        [
          {
            content,
            file: "file.yaml",
            type: CoatManifestFileType.Yaml,
          },
        ],
        testContext
      );
      expect(polished[0].content).toMatchInlineSnapshot(`"formatted"`);

      expect(formatSpy).toHaveBeenCalledTimes(1);
    });
  });
});
