import chalk from "chalk";
import { handleUnknownProperties } from "./handle-unknown-properties";
import { ValidationIssueType } from "./validation-issue";

describe("validation/handle-unknown-properties", () => {
  test("should return no issues without any unknown properties", () => {
    const allPossibleProps: string[] = [];
    const unknownProps: string[] = [];
    const declaredProps: string[] = [];

    const issues = [
      ...handleUnknownProperties({
        allOptionalProps: allPossibleProps,
        unknownProps,
        declaredProps,
      }),
    ];

    expect(issues).toHaveLength(0);
  });

  test("should return a suggestion if a property is slightly mis-spelled", () => {
    const allPossibleProps: string[] = ["possible", "different", "third"];
    const unknownProps: string[] = ["posssible"];
    const declaredProps: string[] = [];

    const issues = [
      ...handleUnknownProperties({
        allOptionalProps: allPossibleProps,
        unknownProps,
        declaredProps,
      }),
    ];

    expect(issues).toHaveLength(1);
    expect(issues).toEqual([
      {
        type: ValidationIssueType.Warning,
        message: chalk`{green posssible:} Unknown property. Did you mean {magenta possible}?`,
        propertyPath: ["posssible"],
      },
    ]);
  });

  test("should not return a suggestion if a property has no close match", () => {
    const allPossibleProps: string[] = ["possible", "different", "third"];
    const unknownProps: string[] = ["somethingElse"];
    const declaredProps: string[] = [];

    const issues = [
      ...handleUnknownProperties({
        allOptionalProps: allPossibleProps,
        unknownProps,
        declaredProps,
      }),
    ];

    expect(issues).toHaveLength(1);
    expect(issues).toEqual([
      {
        type: ValidationIssueType.Warning,
        message: chalk`{green somethingElse:} Unknown property.`,
        propertyPath: ["somethingElse"],
      },
    ]);
  });

  test("should add property prefix to property path", () => {
    const allPossibleProps: string[] = ["possible", "different", "third"];
    const unknownProps: string[] = ["posssible"];
    const declaredProps: string[] = [];

    const issues = [
      ...handleUnknownProperties({
        allOptionalProps: allPossibleProps,
        unknownProps,
        declaredProps,
        propertyPrefixPath: ["prefix", 0, "are"],
      }),
    ];

    expect(issues).toHaveLength(1);
    expect(issues).toEqual([
      {
        type: ValidationIssueType.Warning,
        message: chalk`{green prefix[0].are.posssible:} Unknown property. Did you mean {magenta possible}?`,
        propertyPath: ["prefix", 0, "are", "posssible"],
      },
    ]);
  });
});
