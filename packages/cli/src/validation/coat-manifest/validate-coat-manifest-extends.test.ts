/* eslint-disable @typescript-eslint/no-empty-function */
import chalk from "chalk";
import { CoatManifest } from "../../types/coat-manifest";
import { ValidationIssueType } from "../validation-issue";
import { validateCoatManifestExtends } from "./validate-coat-manifest-extends";

describe("validation/coat-manifest/validate-coat-manifest-extends", () => {
  test("should return no issues for a valid string", () => {
    const extendsProp: CoatManifest["extends"] = "my-template";

    const issues = [...validateCoatManifestExtends(extendsProp)];

    expect(issues).toHaveLength(0);
  });

  test("should return no issues for an empty array", () => {
    const extendsProp: CoatManifest["extends"] = [];

    const issues = [...validateCoatManifestExtends(extendsProp)];

    expect(issues).toHaveLength(0);
  });

  test("should return no issues for a valid array", () => {
    const extendsProp: CoatManifest["extends"] = [
      "my-template",
      ["my-second-tempalte", { configValue: true }],
    ];

    const issues = [...validateCoatManifestExtends(extendsProp)];

    expect(issues).toHaveLength(0);
  });

  test.each`
    entry       | description
    ${123}      | ${"number"}
    ${{}}       | ${"object"}
    ${true}     | ${"boolean"}
    ${() => {}} | ${"function"}
    ${null}     | ${"null"}
  `(
    "should return an issue for an invalid extends property - $description",
    ({ entry }) => {
      const extendsProp: CoatManifest["extends"] = entry;

      const issues = [...validateCoatManifestExtends(extendsProp)];

      expect(issues).toHaveLength(1);
      expect(issues).toEqual([
        {
          type: ValidationIssueType.Error,
          message: chalk`{green extends:} must either be a template name or an array of templates.`,
          propertyPath: ["extends"],
          shortMessage:
            "must either be a template name or an array of templates.",
        },
      ]);
    }
  );

  test("should return an issue for an empty string", () => {
    const extendsProp: CoatManifest["extends"] = "";

    const issues = [...validateCoatManifestExtends(extendsProp)];

    expect(issues).toHaveLength(1);
    expect(issues).toEqual([
      {
        type: ValidationIssueType.Error,
        message: chalk`{green extends:} template name must not be empty.`,
        propertyPath: ["extends"],
        shortMessage: "template name must not be empty.",
      },
    ]);
  });

  test.each`
    template    | description
    ${123}      | ${"number"}
    ${{}}       | ${"object"}
    ${true}     | ${"boolean"}
    ${() => {}} | ${"function"}
    ${null}     | ${"null"}
  `(
    "should return an issue for an invalid member in the array - $description",
    ({ template }) => {
      const extendsProp: CoatManifest["extends"] = ["my-template", template];

      const issues = [...validateCoatManifestExtends(extendsProp)];

      expect(issues).toHaveLength(1);
      expect(issues).toEqual([
        {
          type: ValidationIssueType.Error,
          message: chalk`{green extends[1]:} array entries must either be a template name or tuple ([templateName, \{ templateConfig: true \}]).`,
          propertyPath: ["extends", 1],
          shortMessage:
            "must either be a template name or a tuple ([templateName, { templateConfig: true }]).",
        },
      ]);
    }
  );

  test("should return an issue for an empty string member in the array", () => {
    const extendsProp: CoatManifest["extends"] = ["my-template", ""];

    const issues = [...validateCoatManifestExtends(extendsProp)];

    expect(issues).toHaveLength(1);
    expect(issues).toEqual([
      {
        type: ValidationIssueType.Error,
        message: chalk`{green extends[1]:} template name must not be empty.`,
        propertyPath: ["extends", 1],
        shortMessage: "template name must not be empty.",
      },
    ]);
  });

  test.each`
    template                                                 | description
    ${[]}                                                    | ${"array length: 0"}
    ${["my-template"]}                                       | ${"array length: 1"}
    ${["my-template", { config1: true }, { config2: true }]} | ${"array length: 3"}
  `(
    "should return an issue for tuples that are not couples - $description",
    ({ template }) => {
      const extendsProp: CoatManifest["extends"] = ["my-template", template];

      const issues = [...validateCoatManifestExtends(extendsProp)];

      expect(issues).toHaveLength(1);
      expect(issues).toEqual([
        {
          type: ValidationIssueType.Error,
          message: chalk`{green extends[1]:} tuple entries must be couples (e.g. [templateName, \{ templateConfig: true \}]).`,
          propertyPath: ["extends", 1],
          shortMessage:
            "must be a couple (e.g. [templateName, { templateConfig: true }]).",
        },
      ]);
    }
  );

  test.each`
    template          | description
    ${[123, {}]}      | ${"number"}
    ${[{}, {}]}       | ${"object"}
    ${[true, {}]}     | ${"boolean"}
    ${[[], {}]}       | ${"array"}
    ${[() => {}, {}]} | ${"function"}
    ${["", {}]}       | ${"empty string"}
    ${[null, {}]}     | ${"null"}
  `(
    "should return an issue for tuples that have an invalid template name value - $description",
    ({ template }) => {
      const extendsProp: CoatManifest["extends"] = ["my-template", template];

      const issues = [...validateCoatManifestExtends(extendsProp)];

      expect(issues).toHaveLength(1);
      expect(issues).toEqual([
        {
          type: ValidationIssueType.Error,
          message: chalk`{green extends[1]:} tuple entries must have a template name as the first member.`,
          propertyPath: ["extends", 1, 0],
          shortMessage: "must be a template name.",
        },
      ]);
    }
  );

  test.each`
    template                     | description
    ${["my-template", 123]}      | ${"number"}
    ${["my-template", true]}     | ${"boolean"}
    ${["my-template", []]}       | ${"array"}
    ${["my-template", () => {}]} | ${"function"}
    ${["my-template", "config"]} | ${"string"}
    ${["my-template", null]}     | ${"null"}
  `(
    "should return an issue for tuples that have an invalid template config value - $description",
    ({ template }) => {
      const extendsProp: CoatManifest["extends"] = ["my-template", template];

      const issues = [...validateCoatManifestExtends(extendsProp)];

      expect(issues).toHaveLength(1);
      expect(issues).toEqual([
        {
          type: ValidationIssueType.Error,
          message: chalk`{green extends[1]:} tuple entries must have a configuration object as the second member.`,
          propertyPath: ["extends", 1, 1],
          shortMessage: "must be a configuration object",
        },
      ]);
    }
  );
});
