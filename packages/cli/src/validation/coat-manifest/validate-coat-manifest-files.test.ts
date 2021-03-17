/* eslint-disable @typescript-eslint/no-empty-function */
import chalk from "chalk";
import {
  CoatManifestFile,
  CoatManifestFileType,
} from "../../types/coat-manifest-file";
import { ValidationIssueType } from "../validation-issue";
import { validateCoatManifestFiles } from "./validate-coat-manifest-files";

describe("validation/coat-manifest/validate-coat-manifest-files", () => {
  test("should return no issues for an empty files array", () => {
    const files: CoatManifestFile[] = [];

    const issues = [...validateCoatManifestFiles(files)];

    expect(issues).toHaveLength(0);
  });

  test("should return no issues for valid files", () => {
    const files: CoatManifestFile[] = [
      {
        type: CoatManifestFileType.Json,
        file: "file1.json",
        content: {
          a: true,
        },
      },
      {
        type: CoatManifestFileType.Yaml,
        file: "file2.yaml",
        content: {
          b: true,
        },
        local: true,
      },
      {
        type: CoatManifestFileType.Text,
        file: "file3.txt",
        content: async () => "some-text",
        local: true,
        once: true,
      },
    ];

    const issues = [...validateCoatManifestFiles(files)];

    expect(issues).toHaveLength(0);
  });

  test.each`
    files       | description
    ${123}      | ${"number"}
    ${{}}       | ${"object"}
    ${"string"} | ${"string"}
    ${true}     | ${"boolean"}
    ${() => {}} | ${"function"}
    ${null}     | ${"null"}
  `(
    "should return an issue if files are not an array - $description",
    ({ files }) => {
      const issues = [...validateCoatManifestFiles(files)];

      expect(issues).toHaveLength(1);
      expect(issues).toEqual([
        {
          type: ValidationIssueType.Error,
          message: chalk`{green files:} must be an array.`,
          propertyPath: ["files"],
          shortMessage: "must be an array.",
        },
      ]);
    }
  );

  test.each`
    files         | description
    ${[123]}      | ${"number"}
    ${["file"]}   | ${"string"}
    ${[[]]}       | ${"array"}
    ${[true]}     | ${"boolean"}
    ${[() => {}]} | ${"function"}
    ${[null]}     | ${"null"}
  `(
    "should return an issue for an invalid files array entry - $description",
    ({ files }) => {
      const issues = [...validateCoatManifestFiles(files)];

      expect(issues).toHaveLength(1);
      expect(issues).toEqual([
        {
          type: ValidationIssueType.Error,
          message: chalk`{green files[0]:} must be an object.`,
          propertyPath: ["files", 0],
          shortMessage: "must be an object.",
        },
      ]);
    }
  );

  test.each`
    files                                                  | description
    ${[{ file: 123, type: "TEXT", content: "text" }]}      | ${"number"}
    ${[{ file: [], type: "TEXT", content: "text" }]}       | ${"array"}
    ${[{ file: [], type: "TEXT", content: "text" }]}       | ${"object"}
    ${[{ file: true, type: "TEXT", content: "text" }]}     | ${"boolean"}
    ${[{ file: () => {}, type: "TEXT", content: "text" }]} | ${"function"}
    ${[{ file: null, type: "TEXT", content: "text" }]}     | ${"null"}
    ${[{ file: "", type: "TEXT", content: "text" }]}       | ${"empty string"}
  `(
    "should return an issue for an invalid file property - $description",
    ({ files }) => {
      const issues = [...validateCoatManifestFiles(files)];

      expect(issues).toHaveLength(1);
      expect(issues).toEqual([
        {
          type: ValidationIssueType.Error,
          message: chalk`{green files[0].file:} must be a relative path.`,
          propertyPath: ["files", 0, "file"],
          shortMessage: "must be a relative path.",
        },
      ]);
    }
  );

  test("should return an issue for a missing file property - with a suggestion", () => {
    const files: CoatManifestFile[] = [
      {
        type: CoatManifestFileType.Text,
        content: "test",
        // @ts-expect-error Typo to provoke suggestion
        fille: "file.txt",
      },
    ];

    const issues = [...validateCoatManifestFiles(files)];

    expect(issues).toHaveLength(1);
    expect(issues).toEqual([
      {
        type: ValidationIssueType.Error,
        message: chalk`{green files[0].file:} must be a relative path. Did you misspell {magenta fille}?`,
        propertyPath: ["files", 0, "fille"],
        shortMessage: chalk`did you mean to write {magenta file}?`,
      },
    ]);
  });

  test("should return an issue for a missing file property - without a suggestion", () => {
    const files: CoatManifestFile[] = [
      {
        type: CoatManifestFileType.Text,
        content: "test",
        // @ts-expect-error Additional property for test
        anotherDifferentProperty: "file.txt",
      },
    ];

    const issues = [...validateCoatManifestFiles(files)];

    expect(issues).toHaveLength(2);
    expect(issues).toContainEqual({
      type: ValidationIssueType.Error,
      message: chalk`{green files[0]:} must have a {magenta file} property with the relative file path.`,
      propertyPath: ["files", 0],
      shortMessage: chalk`must have a {magenta file} property with a relative path.`,
    });
    expect(issues).toContainEqual({
      type: ValidationIssueType.Warning,
      message: chalk`{green files[0].anotherDifferentProperty:} Unknown property.`,
      propertyPath: ["files", 0, "anotherDifferentProperty"],
    });
  });

  test.each`
    files                                                   | description
    ${[{ file: "file", type: 123, content: "text" }]}       | ${"number"}
    ${[{ file: "file", type: [], content: "text" }]}        | ${"array"}
    ${[{ file: "file", type: {}, content: "text" }]}        | ${"object"}
    ${[{ file: "file", type: true, content: "text" }]}      | ${"boolean"}
    ${[{ file: "file", type: () => {}, content: "text" }]}  | ${"function"}
    ${[{ file: "file", type: null, content: "text" }]}      | ${"null"}
    ${[{ file: "file", type: "", content: "text" }]}        | ${"empty string"}
    ${[{ file: "file", type: "UNKNOWN", content: "text" }]} | ${"unknown type"}
  `(
    "should return an issue for an invalid type property - $description",
    ({ files }) => {
      const issues = [...validateCoatManifestFiles(files)];

      expect(issues).toHaveLength(1);
      expect(issues).toEqual([
        {
          type: ValidationIssueType.Error,
          message: chalk`{green files[0].type:} must be either {green "JSON"}, {green "YAML"} or {green "TEXT"}.`,
          propertyPath: ["files", 0, "type"],
          shortMessage: chalk`must be either {green "JSON"}, {green "YAML"} or {green "TEXT"}.`,
        },
      ]);
    }
  );

  test("should return an issue for a missing type property - with a suggestion", () => {
    const files: CoatManifestFile[] = [
      {
        file: "file",
        content: "test",
        // @ts-expect-error Typo to provoke suggestion
        typpe: "TEXT",
      },
    ];

    const issues = [...validateCoatManifestFiles(files)];

    expect(issues).toHaveLength(1);
    expect(issues).toEqual([
      {
        type: ValidationIssueType.Error,
        message: chalk`{green files[0].type:} must be either {green "JSON"}, {green "YAML"} or {green "TEXT"}. Did you misspell {magenta typpe}?`,
        propertyPath: ["files", 0, "typpe"],
        shortMessage: chalk`did you mean to write {magenta type}?`,
      },
    ]);
  });

  test("should return an issue for a missing type property - without a suggestion", () => {
    const files: CoatManifestFile[] = [
      {
        file: "file",
        content: "test",
        // @ts-expect-error Additional unknown property
        else: "TEXT",
      },
    ];

    const issues = [...validateCoatManifestFiles(files)];

    expect(issues).toHaveLength(2);
    expect(issues).toContainEqual({
      type: ValidationIssueType.Error,
      message: chalk`{green files[0]:} must have a {magenta type} property that is either {green "JSON"}, {green "YAML"} or {green "TEXT"}.`,
      propertyPath: ["files", 0],
      shortMessage: chalk`must have a {magenta type} property that is either {green "JSON"}, {green "YAML"} or {green "TEXT"}.`,
    });
    expect(issues).toContainEqual({
      type: ValidationIssueType.Warning,
      message: chalk`{green files[0].else:} Unknown property.`,
      propertyPath: ["files", 0, "else"],
    });
  });

  test.each`
    files                                                                | description
    ${[{ file: "file", type: "TEXT", content: "text", once: 123 }]}      | ${"number"}
    ${[{ file: "file", type: "TEXT", content: "text", once: [] }]}       | ${"array"}
    ${[{ file: "file", type: "TEXT", content: "text", once: {} }]}       | ${"object"}
    ${[{ file: "file", type: "TEXT", content: "text", once: () => {} }]} | ${"function"}
    ${[{ file: "file", type: "TEXT", content: "text", once: null }]}     | ${"null"}
  `(
    "should return an issue for an invalid once property - $description",
    ({ files }) => {
      const issues = [...validateCoatManifestFiles(files)];

      expect(issues).toHaveLength(1);
      expect(issues).toEqual([
        {
          type: ValidationIssueType.Error,
          message: chalk`{green files[0].once:} must be a boolean.`,
          propertyPath: ["files", 0, "once"],
          shortMessage: "must be a boolean.",
        },
      ]);
    }
  );

  test.each`
    files                                                                 | description
    ${[{ file: "file", type: "TEXT", content: "text", local: 123 }]}      | ${"number"}
    ${[{ file: "file", type: "TEXT", content: "text", local: [] }]}       | ${"array"}
    ${[{ file: "file", type: "TEXT", content: "text", local: {} }]}       | ${"object"}
    ${[{ file: "file", type: "TEXT", content: "text", local: () => {} }]} | ${"function"}
    ${[{ file: "file", type: "TEXT", content: "text", local: null }]}     | ${"null"}
  `(
    "should return an issue for an invalid once property - $description",
    ({ files }) => {
      const issues = [...validateCoatManifestFiles(files)];

      expect(issues).toHaveLength(1);
      expect(issues).toEqual([
        {
          type: ValidationIssueType.Error,
          message: chalk`{green files[0].local:} must be a boolean.`,
          propertyPath: ["files", 0, "local"],
          shortMessage: "must be a boolean.",
        },
      ]);
    }
  );

  describe("JSON", () => {
    test.each`
      files                                                | description
      ${[{ file: "file", type: "JSON", content: 123 }]}    | ${"number"}
      ${[{ file: "file", type: "JSON", content: [] }]}     | ${"array"}
      ${[{ file: "file", type: "JSON", content: true }]}   | ${"boolean"}
      ${[{ file: "file", type: "JSON", content: "text" }]} | ${"string"}
    `(
      "should return an issue for an invalid content property - $description",
      ({ files }) => {
        const issues = [...validateCoatManifestFiles(files)];

        expect(issues).toHaveLength(1);
        expect(issues).toEqual([
          {
            type: ValidationIssueType.Error,
            message: chalk`{green files[0].content:} must be null, a valid JSON object or a function that returns one, since the file.type is JSON.`,
            propertyPath: ["files", 0, "content"],
            shortMessage:
              "must be null, a valid JSON object or a function that returns one.",
          },
        ]);
      }
    );

    test("should return an issue for a missing content property - with a suggestion", () => {
      const files: CoatManifestFile[] = [
        {
          file: "file",
          type: CoatManifestFileType.Json,
          // @ts-expect-error Typo to provoke suggestion
          conttent: {},
        },
      ];

      const issues = [...validateCoatManifestFiles(files)];

      expect(issues).toHaveLength(1);
      expect(issues).toEqual([
        {
          type: ValidationIssueType.Error,
          message: chalk`{green files[0].content:} must be null, a valid JSON object or a function that returns one, since the file.type is JSON. Did you misspell {magenta conttent}?`,
          propertyPath: ["files", 0, "conttent"],
          shortMessage: chalk`did you mean to write {magenta content}?`,
        },
      ]);
    });

    test("should return an issue for a missing content property - without a suggestion", () => {
      const files: CoatManifestFile[] = [
        {
          file: "file",
          type: CoatManifestFileType.Json,
          // @ts-expect-error Unknown property
          else: {},
        },
      ];

      const issues = [...validateCoatManifestFiles(files)];

      expect(issues).toHaveLength(2);
      expect(issues).toContainEqual({
        type: ValidationIssueType.Error,
        message: chalk`{green files[0]:} must have a {magenta content} property that is null, a valid JSON object or a function that returns one, since the file.type is JSON.`,
        propertyPath: ["files", 0],
        shortMessage: chalk`must have a {magenta content} property that is null, a valid JSON object or a function that returns one.`,
      });
      expect(issues).toContainEqual({
        type: ValidationIssueType.Warning,
        message: chalk`{green files[0].else:} Unknown property.`,
        propertyPath: ["files", 0, "else"],
      });
    });
  });

  describe("YAML", () => {
    test.each`
      files                                                | description
      ${[{ file: "file", type: "YAML", content: 123 }]}    | ${"number"}
      ${[{ file: "file", type: "YAML", content: [] }]}     | ${"array"}
      ${[{ file: "file", type: "YAML", content: true }]}   | ${"boolean"}
      ${[{ file: "file", type: "YAML", content: "text" }]} | ${"string"}
    `(
      "should return an issue for an invalid content property - $description",
      ({ files }) => {
        const issues = [...validateCoatManifestFiles(files)];

        expect(issues).toHaveLength(1);
        expect(issues).toEqual([
          {
            type: ValidationIssueType.Error,
            message: chalk`{green files[0].content:} must be null, a valid JSON object or a function that returns one, since the file.type is YAML.`,
            propertyPath: ["files", 0, "content"],
            shortMessage:
              "must be null, a valid JSON object or a function that returns one.",
          },
        ]);
      }
    );

    test("should return an issue for a missing content property - with a suggestion", () => {
      const files: CoatManifestFile[] = [
        {
          file: "file",
          type: CoatManifestFileType.Yaml,
          // @ts-expect-error Typo to provoke suggestion
          conttent: {},
        },
      ];

      const issues = [...validateCoatManifestFiles(files)];

      expect(issues).toHaveLength(1);
      expect(issues).toEqual([
        {
          type: ValidationIssueType.Error,
          message: chalk`{green files[0].content:} must be null, a valid JSON object or a function that returns one, since the file.type is YAML. Did you misspell {magenta conttent}?`,
          propertyPath: ["files", 0, "conttent"],
          shortMessage: chalk`did you mean to write {magenta content}?`,
        },
      ]);
    });

    test("should return an issue for a missing content property - without a suggestion", () => {
      const files: CoatManifestFile[] = [
        {
          file: "file",
          type: CoatManifestFileType.Yaml,
          // @ts-expect-error Unknown property
          else: {},
        },
      ];

      const issues = [...validateCoatManifestFiles(files)];

      expect(issues).toHaveLength(2);
      expect(issues).toContainEqual({
        type: ValidationIssueType.Error,
        message: chalk`{green files[0]:} must have a {magenta content} property that is null, a valid JSON object or a function that returns one, since the file.type is YAML.`,
        propertyPath: ["files", 0],
        shortMessage: chalk`must have a {magenta content} property that is null, a valid JSON object or a function that returns one.`,
      });
      expect(issues).toContainEqual({
        type: ValidationIssueType.Warning,
        message: chalk`{green files[0].else:} Unknown property.`,
        propertyPath: ["files", 0, "else"],
      });
    });
  });

  describe("TEXT", () => {
    test.each`
      files                                              | description
      ${[{ file: "file", type: "TEXT", content: 123 }]}  | ${"number"}
      ${[{ file: "file", type: "TEXT", content: [] }]}   | ${"array"}
      ${[{ file: "file", type: "TEXT", content: true }]} | ${"boolean"}
      ${[{ file: "file", type: "TEXT", content: {} }]}   | ${"object"}
    `(
      "should return an issue for an invalid content property - $description",
      ({ files }) => {
        const issues = [...validateCoatManifestFiles(files)];

        expect(issues).toHaveLength(1);
        expect(issues).toEqual([
          {
            type: ValidationIssueType.Error,
            message: chalk`{green files[0].content:} must be null, a string or a function that returns one, since the file.type is TEXT.`,
            propertyPath: ["files", 0, "content"],
            shortMessage:
              "must be null, a string or a function that returns one.",
          },
        ]);
      }
    );

    test("should return an issue for a missing content property - with a suggestion", () => {
      const files: CoatManifestFile[] = [
        {
          file: "file",
          type: CoatManifestFileType.Text,
          // @ts-expect-error Typo to provoke suggestion
          conttent: "",
        },
      ];

      const issues = [...validateCoatManifestFiles(files)];

      expect(issues).toHaveLength(1);
      expect(issues).toEqual([
        {
          type: ValidationIssueType.Error,
          message: chalk`{green files[0].content:} must be null, a string or a function that returns one, since the file.type is TEXT. Did you misspell {magenta conttent}?`,
          propertyPath: ["files", 0, "conttent"],
          shortMessage: chalk`did you mean to write {magenta content}?`,
        },
      ]);
    });

    test("should return an issue for a missing content property - without a suggestion", () => {
      const files: CoatManifestFile[] = [
        {
          file: "file",
          type: CoatManifestFileType.Text,
          // @ts-expect-error Unknown property
          else: {},
        },
      ];

      const issues = [...validateCoatManifestFiles(files)];

      expect(issues).toHaveLength(2);
      expect(issues).toContainEqual({
        type: ValidationIssueType.Error,
        message: chalk`{green files[0]:} must have a {magenta content} property that is null, a string or a function that returns one, since the file.type is TEXT.`,
        propertyPath: ["files", 0],
        shortMessage: chalk`must have a {magenta content} property that is null, a string or a function that returns one.`,
      });
      expect(issues).toContainEqual({
        type: ValidationIssueType.Warning,
        message: chalk`{green files[0].else:} Unknown property.`,
        propertyPath: ["files", 0, "else"],
      });
    });
  });
});
