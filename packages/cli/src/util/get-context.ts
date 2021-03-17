import { promises as fs } from "fs";
import path from "path";
import json5 from "json5";
import { CoatManifest } from "../types/coat-manifest";
import { COAT_MANIFEST_FILENAME } from "../constants";
import { getStrictCoatManifest } from "./get-strict-coat-manifest";
import { CoatContext } from "../types/coat-context";
import {
  getCoatGlobalLockfile,
  getCoatLocalLockfile,
} from "../lockfiles/get-coat-lockfiles";
import { getPackageJson } from "./get-package-json";

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
    coatGlobalLockfile,
    coatLocalLockfile,
    packageJson,
  ] = await Promise.all([
    fs.readFile(path.join(cwd, COAT_MANIFEST_FILENAME), "utf8"),
    getCoatGlobalLockfile(cwd),
    getCoatLocalLockfile(cwd),
    getPackageJson(cwd),
  ]);

  const coatManifest: CoatManifest = json5.parse(coatManifestRaw);
  const coatManifestStrict = getStrictCoatManifest(coatManifest);

  return {
    cwd,
    coatManifest: coatManifestStrict,
    coatGlobalLockfile,
    coatLocalLockfile,
    packageJson,
  };
}
