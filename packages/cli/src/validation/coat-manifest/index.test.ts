/* eslint-disable @typescript-eslint/no-empty-function */
import chalk from "chalk";
import { validateCoatManifest } from ".";
import { CoatManifest } from "../../types/coat-manifest";
import { ValidationIssueType } from "../validation-issue";

describe("validation/coat-manifest - index", () => {
  test("should return no issues for a manifest without any property", () => {
    const testManifest: CoatManifest = {};

    const issues = [...validateCoatManifest(testManifest)];

    expect(issues).toHaveLength(0);
  });

  test("should return an issue for an unknown property - with a suggestion", () => {
    const testManifest: CoatManifest = {
      // @ts-expect-error Typo to provoke suggestion
      extendds: ["template"],
    };

    const issues = [...validateCoatManifest(testManifest)];

    expect(issues).toHaveLength(1);
    expect(issues).toEqual([
      {
        type: ValidationIssueType.Warning,
        message: chalk`{green extendds:} Unknown property. Did you mean {magenta extends}?`,
        propertyPath: ["extendds"],
      },
    ]);
  });

  test("should return an issue for an unknown property - without a suggestion", () => {
    const testManifest: CoatManifest = {
      // @ts-expect-error Typo to provoke suggestion
      unknown: "unknown",
    };

    const issues = [...validateCoatManifest(testManifest)];

    expect(issues).toHaveLength(1);
    expect(issues).toEqual([
      {
        type: ValidationIssueType.Warning,
        message: chalk`{green unknown:} Unknown property.`,
        propertyPath: ["unknown"],
      },
    ]);
  });

  test.each`
    manifest      | description
    ${"asdfsadf"} | ${"string"}
    ${123123}     | ${"number"}
    ${() => {}}   | ${"function"}
    ${true}       | ${"boolean"}
    ${[]}         | ${"array"}
    ${null}       | ${"null"}
  `(
    "should return an issue if the coat manifest is invalid - $description",
    ({ manifest }) => {
      const issues = [...validateCoatManifest(manifest)];

      expect(issues).toHaveLength(1);
      expect(issues).toEqual([
        {
          type: ValidationIssueType.Error,
          message: "The coat manifest file must contain a valid JSON object.",
          propertyPath: [],
          shortMessage:
            "The coat manifest file must contain a valid JSON object.",
        },
      ]);
    }
  );

  test.each`
    manifest      | description
    ${"asdfsadf"} | ${"string"}
    ${123123}     | ${"number"}
    ${() => {}}   | ${"function"}
    ${true}       | ${"boolean"}
    ${[]}         | ${"array"}
    ${null}       | ${"null"}
  `(
    "should return an issue if a coat template is invalid - $description",
    ({ manifest }) => {
      const issues = [...validateCoatManifest(manifest, { isTemplate: true })];

      expect(issues).toHaveLength(1);
      expect(issues).toEqual([
        {
          type: ValidationIssueType.Error,
          message: "The coat template must be a valid object.",
          propertyPath: [],
          shortMessage: "The coat template must be a valid object.",
        },
      ]);
    }
  );

  test("should return an issue if a template function returned a promise instead of a manifest", () => {
    // @ts-expect-error Type error to provoke issue
    const testManifest: CoatManifest = Promise.resolve({});

    const issues = [
      ...validateCoatManifest(testManifest, { isTemplate: true }),
    ];

    expect(issues).toHaveLength(1);
    expect(issues).toEqual([
      {
        type: ValidationIssueType.Error,
        message:
          "The coat template resolved to a promise. Template functions must return the template synchronously.",
        propertyPath: [],
        shortMessage:
          "The coat template resolved to a promise. Template functions must return the template synchronously.",
      },
    ]);
  });
});
