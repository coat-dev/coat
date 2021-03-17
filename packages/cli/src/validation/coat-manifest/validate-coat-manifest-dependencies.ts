import isPlainObject from "lodash/isPlainObject";
import { CoatManifest } from "../../types/coat-manifest";
import { formatPropertyPath } from "../format-property-path";
import { handleUnknownProperties } from "../handle-unknown-properties";
import { ValidationIssue, ValidationIssueType } from "../validation-issue";

function* validateDependenciesType(
  dependencies: Record<string, string> | undefined,
  propertyName: string
): Generator<ValidationIssue, void, void> {
  if (typeof dependencies === "undefined") {
    return;
  }
  const propertyPath = ["dependencies", propertyName];
  const messagePrefix = formatPropertyPath(propertyPath);

  if (!isPlainObject(dependencies)) {
    yield {
      type: ValidationIssueType.Error,
      message: `${messagePrefix} must be an object.`,
      propertyPath,
      shortMessage: "must be an object.",
    };
  } else {
    const dependencyEntries = Object.entries(dependencies);

    for (const [dependencyKey, dependencyVersion] of dependencyEntries) {
      // Should not contain any empty key
      if (dependencyKey === "") {
        yield {
          type: ValidationIssueType.Error,
          message: `${messagePrefix} must not contain an empty dependency name.`,
          propertyPath,
          shortMessage: "must not contain an empty dependency name.",
        };
      }

      if (typeof dependencyVersion !== "string" || !dependencyVersion) {
        // Should not contain an empty version for a dependency
        yield {
          type: ValidationIssueType.Error,
          message: `${formatPropertyPath([
            "dependencies",
            propertyName,
            dependencyKey,
          ])} dependency version must not be empty.`,
          propertyPath: [...propertyPath, dependencyKey],
          shortMessage: "dependency version must not be empty.",
        };
      }
    }
  }
}

export function* validateCoatManifestDependencies(
  dependenciesProp: CoatManifest["dependencies"]
): Generator<ValidationIssue, void, void> {
  if (typeof dependenciesProp !== "undefined") {
    if (
      typeof dependenciesProp !== "object" ||
      Array.isArray(dependenciesProp) ||
      dependenciesProp === null
    ) {
      yield {
        type: ValidationIssueType.Error,
        message: `${formatPropertyPath(["dependencies"])} must be an object.`,
        propertyPath: ["dependencies"],
        shortMessage: "must be an object.",
      };
      return;
    }

    const {
      dependencies,
      devDependencies,
      optionalDependencies,
      peerDependencies,
      ...additionalDependenciesProps
    } = dependenciesProp;

    yield* validateDependenciesType(dependencies, "dependencies");
    yield* validateDependenciesType(devDependencies, "devDependencies");
    yield* validateDependenciesType(
      optionalDependencies,
      "optionalDependencies"
    );
    yield* validateDependenciesType(peerDependencies, "peerDependencies");

    const additionalDependenciesPropsKeys = Object.keys(
      additionalDependenciesProps
    );
    yield* handleUnknownProperties({
      unknownProps: additionalDependenciesPropsKeys,
      declaredProps: Object.keys(dependenciesProp),
      allOptionalProps: [
        "dependencies",
        "devDependencies",
        "optionalDependencies",
        "peerDependencies",
      ],
      propertyPrefixPath: ["dependencies"],
    });
  }
}
