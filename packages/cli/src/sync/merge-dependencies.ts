import semverMinVersion from "semver/ranges/min-version";
import semverIntersects from "semver/ranges/intersects";
import { CoatManifestStrict } from "../types/coat-manifest";
import { SemVer } from "semver";

// Eslint errors about reassigning parameters
// are disabled for this function since it is the
// functions purpose to add or overwrite dependencies
// in the target object
//
/* eslint-disable no-param-reassign */
function applyDependencies(
  target: Partial<Record<string, string>>,
  source: Partial<Record<string, string>>
): void {
  if (!source) {
    return;
  }

  Object.entries(source).forEach(([dependencyName, versionRange]) => {
    const currentVersionRange = target[dependencyName];
    if (!currentVersionRange) {
      target[dependencyName] = versionRange;
      return;
    }

    if (!versionRange) {
      throw new Error("dependency version must be defined");
    }

    // Compare whether currentVersionRange is compatible with versionRange
    let minVersionResult: SemVer | null = null;
    try {
      minVersionResult = semverMinVersion(currentVersionRange);
    } catch (error) {
      // currentVersionRange might be a git based dependency or file path
      // and should be overridden
    }

    let intersects = false;
    if (minVersionResult) {
      try {
        intersects = semverIntersects(minVersionResult.version, versionRange);
      } catch (error) {
        // currentVersionRange might be a git based dependency or file path
        // and should be overridden
      }
    }

    if (!minVersionResult || !intersects) {
      // TODO: See #15
      // Warn that incompatible dependency version has been overwritten
      target[dependencyName] = versionRange;
    }
  });
}
/* eslint-enable no-param-reassign */

/**
 * Merges all dependencies that have been declared in the coat project
 * and its templates.
 *
 * Dependencies are only overriden if the current version doesn't satisfy
 * a newer declared version.
 * Example:
 *
 * templateA declares a dependency on "package": "^1.0.5"
 * templateB declares a dependency on "package": "^1.0.1"
 * templateC declares a dependency on "package": "^1.1.0"
 * Result: "package": "^1.1.0" (satisfies all three templates)
 *
 * @param allDependencies All dependencies of the current coat project
 */
export function mergeDependencies(
  allDependencies: CoatManifestStrict["dependencies"][]
): CoatManifestStrict["dependencies"] {
  return allDependencies.reduce<Required<CoatManifestStrict["dependencies"]>>(
    (result, template) => {
      applyDependencies(result.dependencies, template.dependencies);
      applyDependencies(result.devDependencies, template.devDependencies);
      applyDependencies(result.peerDependencies, template.peerDependencies);
      applyDependencies(
        result.optionalDependencies,
        template.optionalDependencies
      );
      return result;
    },
    {
      dependencies: {},
      devDependencies: {},
      peerDependencies: {},
      optionalDependencies: {},
    }
  );
}
