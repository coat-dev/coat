import { CoatManifest, CoatManifestStrict } from "../types/coat-manifest";

/**
 * Adds empty objects for all dependency groups if necessary
 *
 * @param dependencies Dependencies from the coat manifest or template
 */
function getStrictDependencies(
  dependencies: CoatManifest["dependencies"]
): CoatManifestStrict["dependencies"] {
  return {
    dependencies: dependencies?.dependencies ?? {},
    devDependencies: dependencies?.devDependencies ?? {},
    optionalDependencies: dependencies?.optionalDependencies ?? {},
    peerDependencies: dependencies?.peerDependencies ?? {},
  };
}

/**
 * Adds all missing properties to a coat manifest or template file
 * to access these properties safely in following code.
 *
 * @param coatManifest The manifest file that has been read from the disk
 */
export function getStrictCoatManifest(
  coatManifest: CoatManifest
): CoatManifestStrict {
  let extendsEntries: CoatManifestStrict["extends"] = [];
  if (coatManifest.extends) {
    if (typeof coatManifest.extends === "string") {
      extendsEntries.push(coatManifest.extends);
    } else {
      extendsEntries = coatManifest.extends;
    }
  }

  // TODO: See #18
  // Validate all properties
  // e.g. file type
  // also check that it is not a promise
  // (e.g. from importing and calling an async function)

  const strictManifest: CoatManifestStrict = {
    ...coatManifest,
    extends: extendsEntries,
    files: coatManifest.files ?? [],
    dependencies: getStrictDependencies(coatManifest.dependencies),
    scripts: coatManifest.scripts ?? [],
    setup: coatManifest.setup ?? [],
  };

  return strictManifest;
}
