import chalk from "chalk";
import { findPotentialPropertyMatch } from "./find-potential-property-match";
import { formatPropertyPath } from "./format-property-path";
import { ValidationIssue, ValidationIssueType } from "./validation-issue";

interface HandleUnknownPropertiesInput {
  unknownProps: string[];
  declaredProps: string[];
  allOptionalProps: string[];
  propertyPrefixPath?: (string | number)[];
}

/**
 * Validation helper to generate issues for unknown properties in an object.
 *
 * @param input.allOptionalProps Potential optional properties of an object,
 * required properties should be handled directly in the specific validation methods.
 * @param input.unknownProps Additional props that have been declared and don't correspond
 * to the known schema.
 * @param input.declaredProps All properties that are already declared on the object,
 * to exclude suggestions for already set properties.
 * @param input.propertyPrefixPath The path to the current property, to prefix the
 * formatted result if necessary.
 */
export function* handleUnknownProperties({
  allOptionalProps,
  unknownProps,
  declaredProps,
  propertyPrefixPath = [],
}: HandleUnknownPropertiesInput): Generator<ValidationIssue, void, void> {
  // Remove already declared properties from potential property matches
  const possibleProps = allOptionalProps.filter(
    (prop) => !declaredProps.includes(prop)
  );

  for (const prop of unknownProps) {
    const bestPropertyMatch = findPotentialPropertyMatch(prop, possibleProps);

    const propertyPath = [...propertyPrefixPath, prop];
    const messageParts = [
      `${formatPropertyPath(propertyPath)} Unknown property.`,
    ];

    if (bestPropertyMatch) {
      messageParts.push(chalk` Did you mean {magenta ${bestPropertyMatch}}?`);
    }

    yield {
      type: ValidationIssueType.Warning,
      message: messageParts.join(""),
      propertyPath,
    };
  }
}
