import { PACKAGE_JSON_FILENAME } from "../constants";
import { CoatGlobalLockfileStrict } from "../types/coat-lockfiles";
import {
  CoatManifestGroupedFile,
  CoatManifestMergedFile,
} from "../types/coat-manifest-file";

/**
 * Generates an array of file objects that are used in coat's lockfiles.
 *
 * The lockfile files entries will contain the relative paths and the
 * once property for files that are only generated once, in order to
 * track them across sync runs and not touch or delete them later.
 *
 * @param files The file entries that will be added to the lockfile
 */
export function generateLockfileFiles(
  files: (CoatManifestGroupedFile | CoatManifestMergedFile)[]
): CoatGlobalLockfileStrict["files"] {
  const lockfileFiles = files
    .map((file) => ({
      // File paths should be relative from the coat project
      path: file.relativePath,
      once: !!file.once,
    }))
    // The root package.json file next to the coat manifest file
    // should not be included in the lockfile
    .filter((file) => file.path !== PACKAGE_JSON_FILENAME);

  // Sort lockfile files alphabetically
  lockfileFiles.sort((a, b) => a.path.localeCompare(b.path));

  return lockfileFiles;
}
