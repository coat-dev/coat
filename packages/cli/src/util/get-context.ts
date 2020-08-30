import { promises as fs } from "fs";
import path from "path";
import { PackageJson } from "type-fest";
import { CoatManifest } from "../types/coat-manifest";
import { PACKAGE_JSON_FILENAME, COAT_MANIFEST_FILENAME } from "../constants";
import { getStrictCoatManifest } from "./get-strict-coat-manifest";
import { CoatContext } from "../types/coat-context";
import {
  getCoatGlobalLockfile,
  getCoatLocalLockfile,
} from "../lockfiles/get-coat-lockfiles";

/**
 * Retrieves and parses files that are relevant
 * for a coat project
 *
 * @param cwd The directory of a coat project
 */
export async function getContext(cwd: string): Promise<CoatContext> {
  // Read package.json & coat.json files
  // TODO: See #15
  // More friendly error messages if files are missing
  const [
    coatManifestRaw,
    packageJsonRaw,
    coatGlobalLockfile,
    coatLocalLockfile,
  ] = await Promise.all([
    fs.readFile(path.join(cwd, COAT_MANIFEST_FILENAME), "utf8"),
    fs.readFile(path.join(cwd, PACKAGE_JSON_FILENAME), "utf8"),
    getCoatGlobalLockfile(cwd),
    getCoatLocalLockfile(cwd),
  ]);

  const coatManifest: CoatManifest = JSON.parse(coatManifestRaw);
  const packageJson: PackageJson = JSON.parse(packageJsonRaw);

  const coatManifestStrict = getStrictCoatManifest(coatManifest);

  return {
    cwd,
    coatManifest: coatManifestStrict,
    coatGlobalLockfile,
    coatLocalLockfile,
    packageJson,
  };
}
