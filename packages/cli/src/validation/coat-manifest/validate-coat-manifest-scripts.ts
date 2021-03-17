import chalk from "chalk";
import { CoatManifest } from "../../types/coat-manifest";
import { CoatManifestScript } from "../../types/coat-manifest-script";
import { findPotentialPropertyMatch } from "../find-potential-property-match";
import { formatPropertyPath } from "../format-property-path";
import { handleUnknownProperties } from "../handle-unknown-properties";
import { ValidationIssue, ValidationIssueType } from "../validation-issue";

function* validateCoatManifestScript(
  script: CoatManifestScript,
  index: number
): Generator<ValidationIssue, void, void> {
  if (typeof script !== "object" || Array.isArray(script) || script === null) {
    yield {
      type: ValidationIssueType.Error,
      message: `${formatPropertyPath(["scripts", index])} must be an object.`,
      propertyPath: ["scripts", index],
      shortMessage: "must be an object.",
    };
    return;
  }

  const { id, run, scriptName, ...additionalProps } = script;

  const additionalPropKeys = new Set(Object.keys(additionalProps));

  const valuesToValidate = [
    {
      value: id,
      prop: "id",
    },
    {
      value: run,
      prop: "run",
    },
    {
      value: scriptName,
      prop: "scriptName",
    },
  ];

  for (const valueToValidate of valuesToValidate) {
    if (typeof valueToValidate.value === "undefined") {
      const potentialPropertyMatch = findPotentialPropertyMatch(
        valueToValidate.prop,
        [...additionalPropKeys]
      );
      if (potentialPropertyMatch) {
        additionalPropKeys.delete(potentialPropertyMatch);
        yield {
          type: ValidationIssueType.Error,
          message: chalk`${formatPropertyPath([
            "scripts",
            index,
            valueToValidate.prop,
          ])} must be a non-empty string. Did you misspell {magenta ${potentialPropertyMatch}}?`,
          propertyPath: ["scripts", index, potentialPropertyMatch],
          shortMessage: chalk`did you mean to write {magenta ${valueToValidate.prop}}?`,
        };
      } else {
        yield {
          type: ValidationIssueType.Error,
          message: chalk`${formatPropertyPath([
            "scripts",
            index,
          ])} must have a {magenta ${
            valueToValidate.prop
          }} property with a non-empty string.`,
          propertyPath: ["scripts", index],
          shortMessage: chalk`must have a {magenta ${valueToValidate.prop}} property with a non-empty string.`,
        };
      }
    } else if (
      typeof valueToValidate.value !== "string" ||
      !valueToValidate.value
    ) {
      yield {
        type: ValidationIssueType.Error,
        message: `${formatPropertyPath([
          "scripts",
          index,
          valueToValidate.prop,
        ])} must be a non-empty string.`,
        propertyPath: ["scripts", index, valueToValidate.prop],
        shortMessage: "must be a non-empty string.",
      };
    }
  }

  yield* handleUnknownProperties({
    allOptionalProps: [],
    declaredProps: Object.keys(script),
    unknownProps: [...additionalPropKeys],
    propertyPrefixPath: ["scripts", index],
  });
}

export function* validateCoatManifestScripts(
  scripts: CoatManifest["scripts"]
): Generator<ValidationIssue, void, void> {
  if (typeof scripts === "undefined") {
    return;
  }

  if (!Array.isArray(scripts)) {
    yield {
      type: ValidationIssueType.Error,
      message: `${formatPropertyPath(["scripts"])} must be an array.`,
      propertyPath: ["scripts"],
      shortMessage: "must be an array.",
    };
    return;
  }

  for (const [index, script] of scripts.entries()) {
    yield* validateCoatManifestScript(script, index);
  }
}
