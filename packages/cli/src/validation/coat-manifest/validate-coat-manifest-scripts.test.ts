/* eslint-disable @typescript-eslint/no-empty-function */
import chalk from "chalk";
import { CoatManifestScript } from "../../types/coat-manifest-script";
import { ValidationIssueType } from "../validation-issue";
import { validateCoatManifestScripts } from "./validate-coat-manifest-scripts";

describe("validation/coat-manifest/validate-coat-manifest-name", () => {
  test("should return no issues for an empty scripts array", () => {
    const scripts: CoatManifestScript[] = [];

    const issues = [...validateCoatManifestScripts(scripts)];

    expect(issues).toHaveLength(0);
  });

  test("should return no issues for valid scripts", () => {
    const scripts: CoatManifestScript[] = [
      {
        id: "1",
        run: "test-run",
        scriptName: "test-script",
      },
      {
        id: "2",
        run: "test-run-2",
        scriptName: "test-script-5",
      },
      {
        id: "3",
        run: "test-run-3",
        scriptName: "test-script",
      },
    ];

    const issues = [...validateCoatManifestScripts(scripts)];

    expect(issues).toHaveLength(0);
  });

  test.each`
    scripts     | description
    ${123}      | ${"number"}
    ${true}     | ${"boolean"}
    ${{}}       | ${"object"}
    ${() => {}} | ${"function"}
    ${"script"} | ${"string"}
    ${null}     | ${"null"}
  `(
    "should return an issue for an invalid scripts property - $description",
    ({ scripts }) => {
      const issues = [...validateCoatManifestScripts(scripts)];

      expect(issues).toHaveLength(1);
      expect(issues).toEqual([
        {
          type: ValidationIssueType.Error,
          message: chalk`{green scripts:} must be an array.`,
          propertyPath: ["scripts"],
          shortMessage: "must be an array.",
        },
      ]);
    }
  );

  test.each`
    scripts       | description
    ${[123]}      | ${"number"}
    ${[true]}     | ${"boolean"}
    ${[[]]}       | ${"array"}
    ${[() => {}]} | ${"function"}
    ${["script"]} | ${"string"}
    ${[null]}     | ${"null"}
  `(
    "should return an issue for an invalid scripts entry - $description",
    ({ scripts }) => {
      const issues = [...validateCoatManifestScripts(scripts)];

      expect(issues).toHaveLength(1);
      expect(issues).toEqual([
        {
          type: ValidationIssueType.Error,
          message: chalk`{green scripts[0]:} must be an object.`,
          propertyPath: ["scripts", 0],
          shortMessage: "must be an object.",
        },
      ]);
    }
  );

  test.each`
    scripts                                                           | description
    ${[{ id: 123, run: "test-run", scriptName: "test-script" }]}      | ${"number"}
    ${[{ id: true, run: "test-run", scriptName: "test-script" }]}     | ${"boolean"}
    ${[{ id: [], run: "test-run", scriptName: "test-script" }]}       | ${"array"}
    ${[{ id: {}, run: "test-run", scriptName: "test-script" }]}       | ${"object"}
    ${[{ id: () => {}, run: "test-run", scriptName: "test-script" }]} | ${"function"}
    ${[{ id: null, run: "test-run", scriptName: "test-script" }]}     | ${"null"}
    ${[{ id: "", run: "test-run", scriptName: "test-script" }]}       | ${"empty string"}
  `(
    "should return an issue for an invalid id property - $description",
    ({ scripts }) => {
      const issues = [...validateCoatManifestScripts(scripts)];

      expect(issues).toHaveLength(1);
      expect(issues).toEqual([
        {
          type: ValidationIssueType.Error,
          message: chalk`{green scripts[0].id:} must be a non-empty string.`,
          propertyPath: ["scripts", 0, "id"],
          shortMessage: "must be a non-empty string.",
        },
      ]);
    }
  );

  test("should return an issue for a missing id property - with a suggestion", () => {
    const scripts: CoatManifestScript[] = [
      {
        run: "test-run",
        scriptName: "test-script",
        // @ts-expect-error Typo to provoke suggestion
        ID: "test-id",
      },
    ];

    const issues = [...validateCoatManifestScripts(scripts)];

    expect(issues).toHaveLength(1);
    expect(issues).toEqual([
      {
        type: ValidationIssueType.Error,
        message: chalk`{green scripts[0].id:} must be a non-empty string. Did you misspell {magenta ID}?`,
        propertyPath: ["scripts", 0, "ID"],
        shortMessage: chalk`did you mean to write {magenta id}?`,
      },
    ]);
  });

  test("should return an issue for a missing id property - without a suggestion", () => {
    const scripts: CoatManifestScript[] = [
      {
        run: "test-run",
        scriptName: "test-script",
        // @ts-expect-error To provoke unknown property
        else: "test-id",
      },
    ];

    const issues = [...validateCoatManifestScripts(scripts)];

    expect(issues).toHaveLength(2);
    expect(issues).toContainEqual({
      type: ValidationIssueType.Error,
      message: chalk`{green scripts[0]:} must have a {magenta id} property with a non-empty string.`,
      propertyPath: ["scripts", 0],
      shortMessage: chalk`must have a {magenta id} property with a non-empty string.`,
    });
    expect(issues).toContainEqual({
      type: ValidationIssueType.Warning,
      message: chalk`{green scripts[0].else:} Unknown property.`,
      propertyPath: ["scripts", 0, "else"],
    });
  });

  test.each`
    scripts                                                     | description
    ${[{ id: "id", run: 123, scriptName: "test-script" }]}      | ${"number"}
    ${[{ id: "id", run: true, scriptName: "test-script" }]}     | ${"boolean"}
    ${[{ id: "id", run: [], scriptName: "test-script" }]}       | ${"array"}
    ${[{ id: "id", run: {}, scriptName: "test-script" }]}       | ${"object"}
    ${[{ id: "id", run: () => {}, scriptName: "test-script" }]} | ${"function"}
    ${[{ id: "id", run: null, scriptName: "test-script" }]}     | ${"null"}
    ${[{ id: "id", run: "", scriptName: "test-script" }]}       | ${"empty string"}
  `(
    "should return an issue for an invalid run property - $description",
    ({ scripts }) => {
      const issues = [...validateCoatManifestScripts(scripts)];

      expect(issues).toHaveLength(1);
      expect(issues).toEqual([
        {
          type: ValidationIssueType.Error,
          message: chalk`{green scripts[0].run:} must be a non-empty string.`,
          propertyPath: ["scripts", 0, "run"],
          shortMessage: "must be a non-empty string.",
        },
      ]);
    }
  );

  test("should return an issue for a missing run property - with a suggestion", () => {
    const scripts: CoatManifestScript[] = [
      {
        id: "test-id",
        scriptName: "test-script",
        // @ts-expect-error Typo to provoke suggestion
        runn: "test-run",
      },
    ];

    const issues = [...validateCoatManifestScripts(scripts)];

    expect(issues).toHaveLength(1);
    expect(issues).toEqual([
      {
        type: ValidationIssueType.Error,
        message: chalk`{green scripts[0].run:} must be a non-empty string. Did you misspell {magenta runn}?`,
        propertyPath: ["scripts", 0, "runn"],
        shortMessage: chalk`did you mean to write {magenta run}?`,
      },
    ]);
  });

  test("should return an issue for a missing run property - without a suggestion", () => {
    const scripts: CoatManifestScript[] = [
      {
        id: "test-id",
        scriptName: "test-script",
        // @ts-expect-error To provoke unknown property
        else: "test-run",
      },
    ];

    const issues = [...validateCoatManifestScripts(scripts)];

    expect(issues).toHaveLength(2);
    expect(issues).toContainEqual({
      type: ValidationIssueType.Error,
      message: chalk`{green scripts[0]:} must have a {magenta run} property with a non-empty string.`,
      propertyPath: ["scripts", 0],
      shortMessage: chalk`must have a {magenta run} property with a non-empty string.`,
    });
    expect(issues).toContainEqual({
      type: ValidationIssueType.Warning,
      message: chalk`{green scripts[0].else:} Unknown property.`,
      propertyPath: ["scripts", 0, "else"],
    });
  });

  test.each`
    scripts                                                  | description
    ${[{ id: "id", run: "test-run", scriptName: 123 }]}      | ${"number"}
    ${[{ id: "id", run: "test-run", scriptName: true }]}     | ${"boolean"}
    ${[{ id: "id", run: "test-run", scriptName: [] }]}       | ${"array"}
    ${[{ id: "id", run: "test-run", scriptName: {} }]}       | ${"object"}
    ${[{ id: "id", run: "test-run", scriptName: () => {} }]} | ${"function"}
    ${[{ id: "id", run: "test-run", scriptName: null }]}     | ${"null"}
    ${[{ id: "id", run: "test-run", scriptName: "" }]}       | ${"empty string"}
  `(
    "should return an issue for an invalid scriptName property",
    ({ scripts }) => {
      const issues = [...validateCoatManifestScripts(scripts)];

      expect(issues).toHaveLength(1);
      expect(issues).toEqual([
        {
          type: ValidationIssueType.Error,
          message: chalk`{green scripts[0].scriptName:} must be a non-empty string.`,
          propertyPath: ["scripts", 0, "scriptName"],
          shortMessage: "must be a non-empty string.",
        },
      ]);
    }
  );

  test("should return an issue for a missing scriptName property - with a suggestion", () => {
    const scripts: CoatManifestScript[] = [
      {
        id: "test-id",
        run: "test-run",
        // @ts-expect-error Typo to provoke suggestion
        scriptname: "test-script",
      },
    ];

    const issues = [...validateCoatManifestScripts(scripts)];

    expect(issues).toHaveLength(1);
    expect(issues).toEqual([
      {
        type: ValidationIssueType.Error,
        message: chalk`{green scripts[0].scriptName:} must be a non-empty string. Did you misspell {magenta scriptname}?`,
        propertyPath: ["scripts", 0, "scriptname"],
        shortMessage: chalk`did you mean to write {magenta scriptName}?`,
      },
    ]);
  });

  test("should return an issue for a missing scriptName property - without a suggestion", () => {
    const scripts: CoatManifestScript[] = [
      {
        id: "test-id",
        run: "test-run",
        // @ts-expect-error To provoke unknown property
        else: "test-script",
      },
    ];

    const issues = [...validateCoatManifestScripts(scripts)];

    expect(issues).toHaveLength(2);
    expect(issues).toContainEqual({
      type: ValidationIssueType.Error,
      message: chalk`{green scripts[0]:} must have a {magenta scriptName} property with a non-empty string.`,
      propertyPath: ["scripts", 0],
      shortMessage: chalk`must have a {magenta scriptName} property with a non-empty string.`,
    });
    expect(issues).toContainEqual({
      type: ValidationIssueType.Warning,
      message: chalk`{green scripts[0].else:} Unknown property.`,
      propertyPath: ["scripts", 0, "else"],
    });
  });
});
