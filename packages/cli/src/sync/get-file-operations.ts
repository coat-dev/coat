import fromPairs from "lodash/fromPairs";
import { CoatContext } from "../types/coat-context";
import { CoatLockfileContinuousFileEntryStrict } from "../types/coat-lockfiles";
import { getFileHash } from "../util/get-file-hash";
import { getNormalizedFilePath } from "../util/get-normalized-file-path";
import { PolishedFile } from "./polish-files";
import { PACKAGE_JSON_FILENAME } from "../constants";

export enum UpdatePrompt {
  Update,
  FirstUpdate,
}

export enum FileOperationType {
  Delete,
  DeleteSkipped,
  Place,
  Update,
  UpdateWithPrompt,
}

interface FileOperationBase {
  type: FileOperationType;
  local: boolean;
  relativePath: string;
  absolutePath: string;
}

interface FileOperationWithoutContent extends FileOperationBase {
  type: FileOperationType.Delete | FileOperationType.DeleteSkipped;
}

interface FileOperationWithContent extends FileOperationBase {
  type: FileOperationType.Place | FileOperationType.Update;
  content: string;
}

export interface FileOperationWithPrompt extends FileOperationBase {
  type: FileOperationType.UpdateWithPrompt;
  content: string;
  prompt: UpdatePrompt;
}

export type FileOperation =
  | FileOperationWithoutContent
  | FileOperationWithContent
  | FileOperationWithPrompt;

interface FileToRemoveParameter extends CoatLockfileContinuousFileEntryStrict {
  local: boolean;
}

/**
 * Writes updates from coat sync to the disk.
 *
 * The top priority is to prevent accidental loss of data,
 * therefore coat sync should prompt the user in certain situations,
 * or automatically skip the creation / deletion.
 *
 * The following table presents the situations where the user shall be prompted:
 *
 * | Scenario / Disk context  | In lockfile (N) On disk (N) | In lockfile (N) Different disk content | In lockfile (N) On disk (Y) | In lockfile (Y) On disk (N) | In lockfile (Y) Different disk content | In lockfile (Y) On disk (Y) |
 * |--------------------------|-----------------------------|----------------------------------------|-----------------------------|-----------------------------|----------------------------------------|-----------------------------|
 * | Once File - Place        | Place                       | /                                      | /                           | /                           | /                                      | /                           |
 * | Continuous File - Place  | Place                       | Prompt                                 | Don't place                 | Place                       | Prompt                                 | Don't place                 |
 * | Continuous File - Delete | /                           | /                                      | /                           | Don't delete                | Don't delete                           | Delete                      |
 *
 * TODO: See #55
 * It could be possible to offer automatic customization file placement
 * if the detected change in a file can be easily refactored by
 * using a customization file.
 *
 * @param allFilesToPlace All files that should be created or updated
 * @param allFilesToRemove All files that should be deleted
 * @param currentFiles The current content of the files on disk
 * @param context The context of the current coat project
 */
export function getFileOperations(
  allFilesToPlace: PolishedFile[],
  allFilesToRemove: FileToRemoveParameter[],
  currentFiles: { [filePath: string]: string | undefined },
  context: CoatContext
): FileOperation[] {
  // Determine which files need to be removed
  const filesToRemove = allFilesToRemove
    .map((file) => ({
      ...file,
      // Add absolute file path to enable lookups and deletion
      absolutePath: getNormalizedFilePath(file.path, context),
    }))
    .filter(
      (file) =>
        // Filter out files that don't exist anymore
        typeof currentFiles[file.absolutePath] !== "undefined" &&
        //
        // Filter out files that will be placed in the same run.
        // This can happen when a file switches from being "local" to "global"
        // or vice versa
        allFilesToPlace.every(
          (fileToPlace) => fileToPlace.file !== file.absolutePath
        )
    );

  // Check which files should not be deleted and rather skipped
  // because the file contents have been modified by the user
  const filesToDelete = filesToRemove.reduce<FileOperation[]>(
    (accumulator, file) => {
      // Type assertion is safe since missing files are filtered out above
      const fileContentOnDisk = currentFiles[file.absolutePath] as string;
      const fileContentOnDiskHash = getFileHash(fileContentOnDisk);

      let type: FileOperationType;
      // If the file content on disk no longer matches the stored hash of the
      // lockfile, the deletion should be skipped
      if (fileContentOnDiskHash !== file.hash) {
        type = FileOperationType.DeleteSkipped;
      } else {
        type = FileOperationType.Delete;
      }

      accumulator.push({
        type,
        relativePath: file.path,
        absolutePath: file.absolutePath,
        local: file.local,
      });

      return accumulator;
    },
    []
  );

  // Retrieve the hashes of all files that have already been managed
  // and are included in the current lockfiles
  //
  // Node.js 10 compatibility
  // Use Object.fromEntries once Node 10 is no longer supported
  const lockfileHashes = fromPairs(
    // Use files from both lockfiles
    [...context.coatGlobalLockfile.files, ...context.coatLocalLockfile.files]
      // Filter out once files, since they don't require updating or deletion
      // and therefore don't have hashes
      .filter((lockfileEntry) => !lockfileEntry.once)
      // Return a tuple of the path and hash of the entries to create a map
      .map((lockfileEntry) => [lockfileEntry.path, lockfileEntry.hash])
  );

  // Split files that can be placed/updated directly and files
  // for which the disk contents have changed and that
  // require prompting the user before overwriting by
  // using different FileOperation types
  const filesToPlace = allFilesToPlace
    // Filter out files that are already up-to-date on the disk
    .filter((file) => currentFiles[file.file] !== file.content)
    .reduce<FileOperation[]>((accumulator, file) => {
      let promptType: UpdatePrompt | undefined;

      // Check cases where the user should be prompted
      if (
        // Special case for package.json
        //
        // Since package.json is updated in place, any updates
        // to it will not prompt the user, since outside modifications
        // (e.g. when adding dependencies) are not persisted in coat's lockfile.
        file.relativePath !== PACKAGE_JSON_FILENAME &&
        //
        // Once files that have already been placed or exist already
        // on the disk have already been filtered out before merging,
        // and can therefore be placed directly without prompting
        !file.once &&
        //
        // If file would not exist yet on the disk it could be placed without prompting
        currentFiles[file.file]
      ) {
        if (!lockfileHashes[file.relativePath]) {
          // The file does not exist yet in the lockfile but
          // the file already exists on the disk.
          //
          // The user should be prompted to understand that
          // this file will now be managed by coat
          promptType = UpdatePrompt.FirstUpdate;
        } else if (
          lockfileHashes[file.relativePath] !==
          // Type assertion is safe, since a missing file entry has already
          // been handled in the if condition above
          getFileHash(currentFiles[file.file] as string)
        ) {
          // The file already exists in the lockfile, but the
          // content on the disk is different to the previously generated
          // file.
          //
          // The user should be prompted to understand that they should
          // rather customize the file than edit it directly
          promptType = UpdatePrompt.Update;
        }
      }

      if (typeof promptType !== "undefined") {
        accumulator.push({
          absolutePath: file.file,
          relativePath: file.relativePath,
          content: file.content,
          local: file.local,
          prompt: promptType,
          type: FileOperationType.UpdateWithPrompt,
        });
      } else {
        let type: FileOperationType;

        if (typeof currentFiles[file.file] !== "undefined") {
          // If the current file already exists on the disk, it
          // is an update rather than a place operation
          type = FileOperationType.Update;
        } else {
          type = FileOperationType.Place;
        }

        accumulator.push({
          absolutePath: file.file,
          relativePath: file.relativePath,
          content: file.content,
          local: file.local,
          type,
        });
      }

      return accumulator;
    }, []);

  // Create file operations, to easily log and
  // apply the different file update types
  const fileOperations: FileOperation[] = [...filesToDelete, ...filesToPlace];

  // Sort file operations by their relative path to
  // create a deterministic and readable log message
  fileOperations.sort((file1, file2) =>
    file1.relativePath.localeCompare(file2.relativePath)
  );

  return fileOperations;
}
