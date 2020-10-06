import differenceBy from "lodash/differenceBy";
import {
  CoatGlobalLockfileStrict,
  CoatLocalLockfileStrict,
  CoatLockfileContinuousFileEntryStrict,
  CoatLockfileFileEntryStrict,
} from "../types/coat-lockfiles";

/**
 * Returns files that are no longer managed by the current coat project.
 *
 * This can happen in cases where the coat project configuration changes and
 * a file that has been generated previously is no longer generated by coat.
 *
 * Example: When switching the build tool configuration from tool A to tool B,
 * the configuration file for tool A "tool-a.config" is no longer a part of the
 * generated files and should be removed from the current project.
 *
 * @param newFiles The files that will be generated from the current context
 * @param currentLockfile The current lockfile that has been generated from a previous execution
 */
export function getUnmanagedFiles(
  newFiles: CoatLockfileFileEntryStrict[],
  currentLockfile: CoatGlobalLockfileStrict | CoatLocalLockfileStrict
): CoatLockfileContinuousFileEntryStrict[] {
  // Get all files that are in the old lockfile
  // but no longer in the new lockfile. This means they
  // have been added previously by coat, but are no longer
  // generated by this project.
  const unmanagedFiles = differenceBy(
    currentLockfile.files.filter(
      // Filter out once files, since they should not be deleted after
      // they have been placed.
      (file): file is CoatLockfileContinuousFileEntryStrict => !file.once
    ),
    newFiles.filter((file) => !file.once),
    "path"
  );

  return unmanagedFiles;
}
