import chalk from "chalk";
import { FileOperation, FileOperationType } from "./update-files-on-disk";

/**
 * Creates a log message for file operations of a sync run.
 *
 * @param fileOperation The file operation that should be logged
 */
export function createFileOperationLogMessage(
  fileOperation: FileOperation
): string {
  let logPrefix: string;

  switch (fileOperation.type) {
    case FileOperationType.Delete:
    case FileOperationType.DeleteSkipped:
      logPrefix = chalk.inverse.red.bold(" DELETED ");
      break;
    case FileOperationType.Place:
      logPrefix = chalk.inverse.green.bold(" CREATED ");
      break;
    case FileOperationType.Update:
      logPrefix = chalk.inverse.blueBright.bold(" UPDATED ");
      break;
  }

  const skipped = fileOperation.type === FileOperationType.DeleteSkipped;

  // prettier-ignore
  const fileMessage = `${skipped ? "(skipped - " : ""}${fileOperation.relativePath}${skipped ? ")" : ""}`;

  let fullMessage = ` ${logPrefix} ${fileMessage}`;
  if (skipped) {
    fullMessage = chalk.dim(fullMessage);
  }

  return fullMessage;
}
