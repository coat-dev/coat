import chalk from "chalk";
import unquotedPropertyValidator from "unquoted-property-validator";

/**
 * Formats a property path to be displayed as a validation issue.
 *
 * @param propertyPath The property path that should be formatted
 * @returns The formatted property path
 */
export function formatPropertyPath(propertyPath: (string | number)[]): string {
  if (!propertyPath.length) {
    return "";
  }

  const [head, ...tail] = propertyPath;

  const tailParts = tail.reduce<string[]>((acc, prop) => {
    // Check whether the current property must be quoted
    // or accessed via square brackets ([])
    const propResult = unquotedPropertyValidator(prop.toString());
    if (propResult.needsBrackets) {
      if (propResult.needsQuotes) {
        acc.push(`[${propResult.quotedValue}]`);
      } else {
        acc.push(`[${prop}]`);
      }
    } else {
      acc.push(`.${prop}`);
    }
    return acc;
  }, []);

  const pathResult = [head, ...tailParts].join("");

  return chalk`{green ${pathResult}:}`;
}
