/* eslint-disable @typescript-eslint/no-empty-function */
import chalk from "chalk";
import { validateCoatManifest } from ".";
import { CoatManifest } from "../../types/coat-manifest";
import { ValidationIssueType } from "../validation-issue";

describe("validation/coat-manifest/validate-coat-manifest-name", () => {
  test("should return no issues for a valid name", () => {
    const testManifest: CoatManifest = { name: "my-project" };

    const issues = [...validateCoatManifest(testManifest)];

    expect(issues).toHaveLength(0);
  });

  test("should return no issues for an empty name string", () => {
    const testManifest: CoatManifest = { name: "" };

    const issues = [...validateCoatManifest(testManifest)];

    expect(issues).toHaveLength(0);
  });

  test.each`
    name        | description
    ${123}      | ${"number"}
    ${[]}       | ${"array"}
    ${{}}       | ${"object"}
    ${true}     | ${"boolean"}
    ${() => {}} | ${"function"}
    ${null}     | ${"null"}
  `(
    "should return an issue for an invalid name property - $description",
    ({ name }) => {
      const testManifest: CoatManifest = {
        name,
      };

      const issues = [...validateCoatManifest(testManifest)];

      expect(issues).toHaveLength(1);
      expect(issues[0]).toEqual({
        type: ValidationIssueType.Error,
        message: chalk`{green name:} must be a string.`,
        propertyPath: ["name"],
        shortMessage: "must be a string.",
      });
    }
  );
});
