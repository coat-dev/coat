import { CoatManifest, CoatManifestStrict } from "../types/coat-manifest";

export function getStrictCoatManifest(
  coatManifest: CoatManifest
): CoatManifestStrict {
  let extendsEntries: string[] = [];
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
    dependencies: coatManifest.dependencies ?? {},
    scripts: coatManifest.scripts ?? [],
  };

  return strictManifest;
}
