import fs from "fs-extra";
import path from "path";
import { prompt } from "inquirer";
import chalk from "chalk";
import fromPairs from "lodash/fromPairs";
import { CoatContext } from "../types/coat-context";
import { CoatLockfileContinuousFileEntryStrict } from "../types/coat-lockfiles";
import { getFileHash } from "../util/get-file-hash";
import { getNormalizedFilePath } from "../util/get-normalized-file-path";
import { PolishedFile, PolishedContinuousFile } from "./polish-files";
import { createFileOperationLogMessage } from "./create-file-operation-log-message";
import { PACKAGE_JSON_FILENAME } from "../constants";

enum UpdatePrompt {
  Update,
  FirstUpdate,
}

interface FileUpdateWithPrompt extends PolishedContinuousFile {
  prompt: UpdatePrompt;
}

export enum FileOperationType {
  Delete,
  DeleteSkipped,
  Place,
  Update,
}

interface FileOperationBase {
  type: FileOperationType;
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

export type FileOperation =
  | FileOperationWithoutContent
  | FileOperationWithContent;

/**
 * Builds a prompt message that should be displayed when coat will update files
 * that are already present on the disk with different content.
 *
 * The message differentiates between the first time a file is generated by
 * coat and a consecutive update of the file, to give better guidance and
 * highlight when an existing file in a project will now be managed by coat,
 * e.g. because a template started to support and manage a certain file after
 * an update.
 *
 * @param filesToUpdatePrompt The files that are or will be managed by coat
 */
function buildFileUpdatePromptMessage(
  allFilesToUpdatePrompt: FileUpdateWithPrompt[]
): string {
  // Sort files to prompt by their relative path
  // to create a deterministic and readable log message
  const sortedFilesToPrompt = [...allFilesToUpdatePrompt].sort((file1, file2) =>
    file1.relativePath.localeCompare(file2.relativePath)
  );

  // Split files into files that have not been managed before
  // and files that were already managed by coat
  const {
    filesToUpdatePromptFirst,
    filesToUpdatePrompt,
  } = sortedFilesToPrompt.reduce<{
    filesToUpdatePromptFirst: FileUpdateWithPrompt[];
    filesToUpdatePrompt: FileUpdateWithPrompt[];
  }>(
    (accumulator, file) => {
      switch (file.prompt) {
        case UpdatePrompt.Update:
          accumulator.filesToUpdatePrompt.push(file);
          break;
        case UpdatePrompt.FirstUpdate:
          accumulator.filesToUpdatePromptFirst.push(file);
          break;
      }
      return accumulator;
    },
    {
      filesToUpdatePromptFirst: [],
      filesToUpdatePrompt: [],
    }
  );

  // TODO: See #52
  // Add link to customization help once it exists

  if (filesToUpdatePromptFirst.length && filesToUpdatePrompt.length) {
    // Build a message that includes both files that have been managed before
    // and files that have not been managed before
    //
    const firstPartPlural = filesToUpdatePromptFirst.length > 1;
    const secondPartPlural = filesToUpdatePrompt.length > 1;

    const firstPartFiles = filesToUpdatePromptFirst
      .map((file) => file.relativePath)
      .join("\n");
    const secondPartFiles = filesToUpdatePrompt
      .map((file) => file.relativePath)
      .join("\n");

    // prettier-ignore
    const promptLines = [
      `The following ${firstPartPlural ? "files" : "file"} already exist in your project and will be overwritten and managed by coat from now:`,
      "", 
      firstPartFiles,
      "", 
      `In addition, the contents of the following ${secondPartPlural ? "files" : "file"} have changed:`,
      "", 
      secondPartFiles,
      "", 
      `${secondPartPlural ? "These files were" : "This file was"} already managed by coat and will be overwritten each time ${chalk.cyan("coat sync")} is run.`,
      "", 
      `You can customize files by placing a ${chalk.green("<filename>-custom.js")} file next to them.`,
      "", 
    ];

    return promptLines.join("\n");
  } else if (filesToUpdatePromptFirst.length) {
    // Build a message for the first time a file or multiple
    // existing files will be managed from coat from now on
    //
    const plural = filesToUpdatePromptFirst.length > 1;
    const promptFiles = filesToUpdatePromptFirst
      .map((file) => file.relativePath)
      .join("\n");

    const customizeFileName = plural
      ? "<filename>-custom.js"
      : `${path.basename(filesToUpdatePromptFirst[0].file)}-custom.js`;

    // prettier-ignore
    const promptLines = [
      `The following ${plural ? "files" : "file"} already exist in your project and will be overwritten and managed by coat from now:`,
      "", 
      promptFiles,
      "", 
      `${plural ? 'These files' : 'This file'} will be overwritten each time ${chalk.cyan('coat sync')} is run. You can customize ${plural ? "them" : "it"} by placing a ${chalk.green(customizeFileName)} file next to ${plural ? "them" : "it"}.`,
      "",
    ];

    return promptLines.join("\n");
  }

  // Build a message for when files that have already been managed by coat
  // have changed, to remind the user that modifying the contents directly
  // will not work and customizations should be used instead
  //
  const plural = filesToUpdatePrompt.length > 1;
  const promptFiles = filesToUpdatePrompt
    .map((file) => file.relativePath)
    .join("\n");

  const customizeFileName = plural
    ? "<filename>-custom.js"
    : `${path.basename(filesToUpdatePrompt[0].file)}-custom.js`;

  // prettier-ignore
  const promptLines = [
    `The contents of the following ${plural ? "files" : "file"} have changed:`,
    "", 
    promptFiles,
    "", 
    `${plural ? "These files are" : "This file is"} managed by coat and will be overwritten each time ${chalk.cyan("coat sync")} is run.`,
    "", 
    `You can customize ${plural ? "them" : "it"} by placing a ${chalk.green(customizeFileName)} file next to ${plural ? "them" : "it"}.`,
    "", 
  ];

  return promptLines.join("\n");
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
export async function updateFilesOnDisk(
  allFilesToPlace: PolishedFile[],
  allFilesToRemove: CoatLockfileContinuousFileEntryStrict[],
  currentFiles: { [filePath: string]: string | undefined },
  context: CoatContext
): Promise<void> {
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
  const { filesToDelete, filesToDeleteSkipped } = filesToRemove.reduce<{
    filesToDelete: (CoatLockfileContinuousFileEntryStrict & {
      absolutePath: string;
    })[];
    filesToDeleteSkipped: (CoatLockfileContinuousFileEntryStrict & {
      absolutePath: string;
    })[];
  }>(
    (accumulator, file) => {
      // Type assertion is safe since missing files are filtered out above
      const fileContentOnDisk = currentFiles[file.absolutePath] as string;
      const fileContentOnDiskHash = getFileHash(fileContentOnDisk);

      // If the file content on disk no longer matches the stored hash of the
      // lockfile, the deletion should be skipped
      if (fileContentOnDiskHash !== file.hash) {
        accumulator.filesToDeleteSkipped.push(file);
      } else {
        accumulator.filesToDelete.push(file);
      }
      return accumulator;
    },
    { filesToDelete: [], filesToDeleteSkipped: [] }
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

  // Group files that can be placed/updated directly and files
  // for which the disk contents have changed and that
  // require prompting the user before overwriting
  const { filesToPlace, filesToPlacePrompt } = allFilesToPlace
    // Filter out files that are already up-to-date on the disk
    .filter((file) => currentFiles[file.file] !== file.content)
    .reduce<{
      filesToPlace: PolishedFile[];
      filesToPlacePrompt: FileUpdateWithPrompt[];
    }>(
      (accumulator, file) => {
        if (file.relativePath === PACKAGE_JSON_FILENAME) {
          // Special case for package.json
          //
          // Since package.json is updated in place, any updates
          // to it will not prompt the user, since outside modifications
          // (e.g. when adding dependencies) are not persisted in coat's lockfile.
          accumulator.filesToPlace.push(file);
        } else if (file.once) {
          // Once files that have already been placed or exist already
          // on the disk have already been filtered out before merging,
          // and can therefore be directly added to the filesToPlace array
          accumulator.filesToPlace.push(file);
        } else {
          if (!currentFiles[file.file]) {
            // If file does not exist yet on the disk it should be placed
            accumulator.filesToPlace.push(file);
          } else if (!lockfileHashes[file.relativePath]) {
            // The file does not exist yet in the lockfile but
            // the file already exists on the disk.
            //
            // The user should be prompted to understand that
            // this file will now be managed by coat
            accumulator.filesToPlacePrompt.push({
              ...file,
              prompt: UpdatePrompt.FirstUpdate,
            });
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
            accumulator.filesToPlacePrompt.push({
              ...file,
              prompt: UpdatePrompt.Update,
            });
          } else {
            // The file already exists and was last updated by coat.
            // It should be updated to the new file content.
            accumulator.filesToPlace.push(file);
          }
        }

        return accumulator;
      },
      { filesToPlace: [], filesToPlacePrompt: [] }
    );

  if (filesToPlacePrompt.length) {
    // Display a message that highlights that coat managed files
    // will be overwritten when running coat sync.
    console.log(buildFileUpdatePromptMessage(filesToPlacePrompt));

    // Prompt the user to confirm that the files should be overwritten.
    // Defaults to "no" to prevent accidental file loss
    const { filesToPlacePrompted } = await prompt({
      type: "confirm",
      name: "filesToPlacePrompted",
      message: `Continue with overwriting ${
        filesToPlacePrompt.length > 1 ? "these files?" : "this file?"
      }`,
      default: false,
    });

    if (!filesToPlacePrompted) {
      // If the prompt is declined, sync should be aborted and
      // coat should exit immediately.
      console.error("Aborting coat sync due to user request.");
      process.exit(1);
    }
    // If the prompt is confirmed, all prompted files should be placed as well
    filesToPlace.push(...filesToPlacePrompt);
  }

  // Create file operations, to easily log and
  // apply the different file update types
  const fileOperations: FileOperation[] = [
    ...filesToDelete.map((file) => ({
      type: FileOperationType.Delete as const,
      relativePath: file.path,
      absolutePath: file.absolutePath,
    })),
    ...filesToDeleteSkipped.map((file) => ({
      type: FileOperationType.DeleteSkipped as const,
      relativePath: file.path,
      absolutePath: file.absolutePath,
    })),
    ...filesToPlace.map((file) => {
      let type: FileOperationType;

      if (typeof currentFiles[file.file] !== "undefined") {
        // If the current file already exists on the disk, it
        // is an update rather than a place operation
        type = FileOperationType.Update;
      } else {
        type = FileOperationType.Place;
      }

      return {
        type,
        relativePath: file.relativePath,
        absolutePath: file.file,
        content: file.content,
      };
    }),
  ];

  // Sort file operations by their relative path to
  // create a deterministic and readable log message
  fileOperations.sort((file1, file2) =>
    file1.relativePath.localeCompare(file2.relativePath)
  );

  const logMessages = [""];
  if (fileOperations.length) {
    // Create log messages for all file operations
    const fileLogMessages = fileOperations.map(createFileOperationLogMessage);
    logMessages.push(...fileLogMessages);

    // Perform the file operations and write or delete them
    await Promise.all(
      fileOperations.map((fileOperation) => {
        switch (fileOperation.type) {
          case FileOperationType.Delete:
            return fs.unlink(fileOperation.absolutePath);
          case FileOperationType.Place:
          case FileOperationType.Update:
            // Use outputFile from fs-extra to automatically create any missing directories
            return fs.outputFile(
              fileOperation.absolutePath,
              fileOperation.content
            );
        }
      })
    );
  } else {
    // No file operation is necessary
    logMessages.push("♻️  Everything up to date️");
  }
  logMessages.push("");

  console.log(logMessages.join("\n"));
}
