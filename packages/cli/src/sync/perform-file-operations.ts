import fs from "fs-extra";
import { EVERYTHING_UP_TO_DATE_MESSAGE } from "../constants";
import {
  createFileOperationLogMessage,
  Tense,
} from "./create-file-operation-log-message";
import { FileOperation, FileOperationType } from "./get-file-operations";

/**
 * Updates the files on disk and logs each operation. If fileOperations is empty,
 * an up-to-date message is logged.
 *
 * @param fileOperations The file operations that will be performed
 */
export async function performFileOperations(
  fileOperations: FileOperation[]
): Promise<void> {
  const logMessages = [];
  if (fileOperations.length) {
    // Create log messages for all file operations
    const fileLogMessages = fileOperations.map((fileOperation) =>
      createFileOperationLogMessage(fileOperation, Tense.Past)
    );
    logMessages.push(...fileLogMessages);

    // Perform the file operations and write or delete them
    await Promise.all(
      fileOperations.map((fileOperation) => {
        switch (fileOperation.type) {
          case FileOperationType.Delete:
            return fs.unlink(fileOperation.absolutePath);
          case FileOperationType.Place:
          case FileOperationType.Update:
          case FileOperationType.UpdateWithPrompt:
            // Use outputFile from fs-extra to automatically create any missing directories
            return fs.outputFile(
              fileOperation.absolutePath,
              fileOperation.content
            );
          case FileOperationType.DeleteSkipped:
            // Don't perform any action
            break;
          // The default case is only required to let TypeScript throw
          // compiler errors if a new FileOperationType is added
          /* istanbul ignore next */
          default: {
            const unhandledFileOperation: never = fileOperation;
            throw new Error(
              `Unhandled FileOperationType for operation: ${unhandledFileOperation}`
            );
          }
        }
      })
    );
  } else {
    // No file operation is necessary
    logMessages.push(EVERYTHING_UP_TO_DATE_MESSAGE);
  }

  console.log(["", ...logMessages, ""].join("\n"));
}
