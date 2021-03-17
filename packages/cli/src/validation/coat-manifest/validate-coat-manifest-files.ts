import chalk from "chalk";
import {
  CoatManifestFile,
  CoatManifestFileType,
} from "../../types/coat-manifest-file";
import { CoatManifest } from "../../types/coat-manifest";
import { ValidationIssue, ValidationIssueType } from "../validation-issue";
import { findPotentialPropertyMatch } from "../find-potential-property-match";
import { handleUnknownProperties } from "../handle-unknown-properties";
import { formatPropertyPath } from "../format-property-path";

/**
 * Dummy function to create an exhaustive switch statement that
 * raises a compile time error when a new file type is added
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function exhaustiveTypeHelper(_type: never): void {
  // Empty function
}

function* validateCoatManifestFile(
  fileEntry: CoatManifestFile,
  index: number
): Generator<ValidationIssue, void, void> {
  if (
    typeof fileEntry !== "object" ||
    fileEntry === null ||
    Array.isArray(fileEntry)
  ) {
    yield {
      type: ValidationIssueType.Error,
      message: `${formatPropertyPath(["files", index])} must be an object.`,
      propertyPath: ["files", index],
      shortMessage: "must be an object.",
    };
    return;
  }

  const { file, content, type, local, once, ...additionalProps } = fileEntry;

  const additionalPropKeys = new Set(Object.keys(additionalProps));

  if (typeof file !== "string" || !file.length) {
    if (typeof file === "undefined") {
      const potentialPropertyMatch = findPotentialPropertyMatch("file", [
        ...additionalPropKeys,
      ]);
      if (potentialPropertyMatch) {
        additionalPropKeys.delete(potentialPropertyMatch);
        yield {
          type: ValidationIssueType.Error,
          message: chalk`${formatPropertyPath([
            "files",
            index,
            "file",
          ])} must be a relative path. Did you misspell {magenta ${potentialPropertyMatch}}?`,
          propertyPath: ["files", index, potentialPropertyMatch],
          shortMessage: chalk`did you mean to write {magenta file}?`,
        };
      } else {
        yield {
          type: ValidationIssueType.Error,
          message: chalk`${formatPropertyPath([
            "files",
            index,
          ])} must have a {magenta file} property with the relative file path.`,
          propertyPath: ["files", index],
          shortMessage: chalk`must have a {magenta file} property with a relative path.`,
        };
      }
    } else {
      yield {
        type: ValidationIssueType.Error,
        message: `${formatPropertyPath([
          "files",
          index,
          "file",
        ])} must be a relative path.`,
        propertyPath: ["files", index, "file"],
        shortMessage: "must be a relative path.",
      };
    }
  }

  switch (type) {
    case CoatManifestFileType.Json:
    case CoatManifestFileType.Yaml:
      if (
        (content !== null &&
          typeof content !== "object" &&
          typeof content !== "function") ||
        Array.isArray(content)
      ) {
        if (typeof content === "undefined") {
          const potentialPropertyMatch = findPotentialPropertyMatch("content", [
            ...additionalPropKeys,
          ]);
          if (potentialPropertyMatch) {
            additionalPropKeys.delete(potentialPropertyMatch);
            yield {
              type: ValidationIssueType.Error,
              message: chalk`${formatPropertyPath([
                "files",
                index,
                "content",
              ])} must be null, a valid JSON object or a function that returns one, since the file.type is ${type}. Did you misspell {magenta ${potentialPropertyMatch}}?`,
              propertyPath: ["files", index, potentialPropertyMatch],
              shortMessage: chalk`did you mean to write {magenta content}?`,
            };
          } else {
            yield {
              type: ValidationIssueType.Error,
              message: chalk`${formatPropertyPath([
                "files",
                index,
              ])} must have a {magenta content} property that is null, a valid JSON object or a function that returns one, since the file.type is ${type}.`,
              propertyPath: ["files", index],
              shortMessage: chalk`must have a {magenta content} property that is null, a valid JSON object or a function that returns one.`,
            };
          }
        } else {
          yield {
            type: ValidationIssueType.Error,
            message: `${formatPropertyPath([
              "files",
              index,
              "content",
            ])} must be null, a valid JSON object or a function that returns one, since the file.type is ${type}.`,
            propertyPath: ["files", index, "content"],
            shortMessage:
              "must be null, a valid JSON object or a function that returns one.",
          };
        }
      }
      break;
    case CoatManifestFileType.Text:
      if (
        content !== null &&
        typeof content !== "string" &&
        typeof content !== "function"
      ) {
        if (typeof content === "undefined") {
          const potentialPropertyMatch = findPotentialPropertyMatch("content", [
            ...additionalPropKeys,
          ]);
          if (potentialPropertyMatch) {
            additionalPropKeys.delete(potentialPropertyMatch);
            yield {
              type: ValidationIssueType.Error,
              message: chalk`${formatPropertyPath([
                "files",
                index,
                "content",
              ])} must be null, a string or a function that returns one, since the file.type is TEXT. Did you misspell {magenta ${potentialPropertyMatch}}?`,
              propertyPath: ["files", index, potentialPropertyMatch],
              shortMessage: chalk`did you mean to write {magenta content}?`,
            };
          } else {
            yield {
              type: ValidationIssueType.Error,
              message: chalk`${formatPropertyPath([
                "files",
                index,
              ])} must have a {magenta content} property that is null, a string or a function that returns one, since the file.type is TEXT.`,
              propertyPath: ["files", index],
              shortMessage: chalk`must have a {magenta content} property that is null, a string or a function that returns one.`,
            };
          }
        } else {
          yield {
            type: ValidationIssueType.Error,
            message: `${formatPropertyPath([
              "files",
              index,
              "content",
            ])} must be null, a string or a function that returns one, since the file.type is TEXT.`,
            propertyPath: ["files", index, "content"],
            shortMessage:
              "must be null, a string or a function that returns one.",
          };
        }
      }
      break;
    default:
      exhaustiveTypeHelper(type);
      if (typeof type === "undefined") {
        const potentialPropertyMatch = findPotentialPropertyMatch("type", [
          ...additionalPropKeys,
        ]);
        if (potentialPropertyMatch) {
          additionalPropKeys.delete(potentialPropertyMatch);
          yield {
            type: ValidationIssueType.Error,
            message: chalk`${formatPropertyPath([
              "files",
              index,
              "type",
            ])} must be either {green "JSON"}, {green "YAML"} or {green "TEXT"}. Did you misspell {magenta ${potentialPropertyMatch}}?`,
            propertyPath: ["files", index, potentialPropertyMatch],
            shortMessage: chalk`did you mean to write {magenta type}?`,
          };
        } else {
          yield {
            type: ValidationIssueType.Error,
            message: chalk`${formatPropertyPath([
              "files",
              index,
            ])} must have a {magenta type} property that is either {green "JSON"}, {green "YAML"} or {green "TEXT"}.`,
            propertyPath: ["files", index],
            shortMessage: chalk`must have a {magenta type} property that is either {green "JSON"}, {green "YAML"} or {green "TEXT"}.`,
          };
        }
      } else {
        yield {
          type: ValidationIssueType.Error,
          // NOTE: Update when new file types are added!
          message: chalk`${formatPropertyPath([
            "files",
            index,
            "type",
          ])} must be either {green "JSON"}, {green "YAML"} or {green "TEXT"}.`,
          propertyPath: ["files", index, "type"],
          shortMessage: chalk`must be either {green "JSON"}, {green "YAML"} or {green "TEXT"}.`,
        };
      }
  }

  if (typeof once !== "undefined" && typeof once !== "boolean") {
    yield {
      type: ValidationIssueType.Error,
      message: `${formatPropertyPath([
        "files",
        index,
        "once",
      ])} must be a boolean.`,
      propertyPath: ["files", index, "once"],
      shortMessage: "must be a boolean.",
    };
  }

  if (typeof local !== "undefined" && typeof local !== "boolean") {
    yield {
      type: ValidationIssueType.Error,
      message: `${formatPropertyPath([
        "files",
        index,
        "local",
      ])} must be a boolean.`,
      propertyPath: ["files", index, "local"],
      shortMessage: "must be a boolean.",
    };
  }

  yield* handleUnknownProperties({
    allOptionalProps: ["local", "once"],
    declaredProps: Object.keys(fileEntry),
    unknownProps: [...additionalPropKeys],
    propertyPrefixPath: ["files", index],
  });
}

export function* validateCoatManifestFiles(
  files: CoatManifest["files"]
): Generator<ValidationIssue, void, void> {
  if (typeof files === "undefined") {
    return;
  }

  if (!Array.isArray(files)) {
    yield {
      type: ValidationIssueType.Error,
      message: `${formatPropertyPath(["files"])} must be an array.`,
      propertyPath: ["files"],
      shortMessage: "must be an array.",
    };
    return;
  }

  for (const [index, file] of files.entries()) {
    yield* validateCoatManifestFile(file, index);
  }
}
