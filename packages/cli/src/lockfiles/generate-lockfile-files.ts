import { PACKAGE_JSON_FILENAME } from "../constants";
import { PolishedFile } from "../sync/polish-files";
import {
  CoatGlobalLockfileStrict,
  CoatLockfileFileEntryStrict,
} from "../types/coat-lockfiles";
import { CoatManifestGroupedFile } from "../types/coat-manifest-file";

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
  files: ((CoatManifestGroupedFile & { once: true }) | PolishedFile)[]
): CoatGlobalLockfileStrict["files"] {
  const lockfileFiles = files
    // The root package.json file next to the coat manifest file
    // should not be included in the lockfile
    .filter((file) => file.relativePath !== PACKAGE_JSON_FILENAME)
    .map<CoatLockfileFileEntryStrict>((file) => {
      if (file.once) {
        // Once files should not store
        // the hash of the generated file
        return {
          // File paths should be relative from the coat project
          path: file.relativePath,
          once: file.once,
        };
      }
      // Continuously managed files should have a hash property
      // to verify that the content on the disk has not been changed
      // before overwriting the file
      return {
        // File paths should be relative from the coat project
        path: file.relativePath,
        once: file.once,
        hash: file.hash,
      };
    });

  // Sort lockfile files alphabetically
  lockfileFiles.sort((a, b) => a.path.localeCompare(b.path));

  return lockfileFiles;
}
