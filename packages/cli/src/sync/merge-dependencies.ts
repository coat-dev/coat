import fromPairs from "lodash/fromPairs";
import semverMinVersion from "semver/ranges/min-version";
import semverIntersects from "semver/ranges/intersects";
import { CoatManifestStrict } from "../types/coat-manifest";
import { SemVer } from "semver";

function applyDependencies(
  target: Record<string, string>,
  source: Record<string, string> | undefined
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

export function mergeDependencies(
  allDependencies: CoatManifestStrict["dependencies"][]
): CoatManifestStrict["dependencies"] {
  const mergedDependencyGroups = allDependencies.reduce<
    Required<CoatManifestStrict["dependencies"]>
  >(
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

  // Remove empty dependency groups
  return fromPairs(
    Object.entries(mergedDependencyGroups).filter(
      ([, dependencies]) => Object.keys(dependencies).length
    )
  );
}
