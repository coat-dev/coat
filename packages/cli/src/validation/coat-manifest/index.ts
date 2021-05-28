import { CoatManifest } from "../../types/coat-manifest";
import { validateCoatManifestScripts } from "./validate-coat-manifest-scripts";
import { ValidationIssue, ValidationIssueType } from "../validation-issue";
import { validateCoatManifestDependencies } from "./validate-coat-manifest-dependencies";
import { validateCoatManifestExtends } from "./validate-coat-manifest-extends";
import { validateCoatManifestFiles } from "./validate-coat-manifest-files";
import { validateCoatManifestName } from "./validate-coat-manifest-name";
import { validateCoatManifestSetup } from "./validate-coat-manifest-setup";
import { handleUnknownProperties } from "../handle-unknown-properties";

interface ValidationOptions {
  isTemplate?: boolean;
}

/**
 * Validates a coat manifest or template
 *
 * @param coatManifest The coat manifest or template object
 * @param options.isTemplate Whether `coatManifest` is a template
 * @returns A generator that returns ValidationIssues
 */
export function* validateCoatManifest(
  coatManifest: CoatManifest,
  { isTemplate }: ValidationOptions = {}
): Generator<ValidationIssue, void, void> {
  if (
    typeof coatManifest !== "object" ||
    Array.isArray(coatManifest) ||
    coatManifest === null
  ) {
    const message = isTemplate
      ? "The coat template must be a valid object."
      : "The coat manifest file must contain a valid JSON object.";
    yield {
      type: ValidationIssueType.Error,
      message,
      propertyPath: [],
      shortMessage: message,
    };

    return;
  }

  // Ensure that coat templates are not returning
  // promises and run synchronously
  if (
    "then" in coatManifest &&
    typeof (coatManifest as Promise<CoatManifest>).then === "function"
  ) {
    // isTemplate === true is implied,
    // since the coat manifest is a JSON file and can't be a promise.
    const message =
      "The coat template resolved to a promise. Template functions must return the template synchronously.";
    yield {
      type: ValidationIssueType.Error,
      message,
      propertyPath: [],
      shortMessage: message,
    };
    return;
  }

  const {
    name,
    extends: extendsProp,
    dependencies,
    files,
    scripts,
    setup,
    ...additionalProps
  } = coatManifest;

  yield* validateCoatManifestName(name);
  yield* validateCoatManifestExtends(extendsProp);
  yield* validateCoatManifestDependencies(dependencies);
  yield* validateCoatManifestFiles(files);
  yield* validateCoatManifestScripts(scripts);
  yield* validateCoatManifestSetup(setup);

  yield* handleUnknownProperties({
    allOptionalProps: [
      "name",
      "extends",
      "dependencies",
      "files",
      "scripts",
      "setup",
    ],
    declaredProps: Object.keys(coatManifest),
    unknownProps: Object.keys(additionalProps),
    propertyPrefixPath: [],
  });
}
