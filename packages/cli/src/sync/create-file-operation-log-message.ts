import chalk from "chalk";
import { FileOperation, FileOperationType } from "./get-file-operations";

export enum Tense {
  Past,
  Future,
}

const operationVerbs = {
  delete: {
    [Tense.Past]: " DELETED ",
    [Tense.Future]: " DELETE ",
  },
  place: {
    [Tense.Past]: " CREATED ",
    [Tense.Future]: " CREATE ",
  },
  update: {
    [Tense.Past]: " UPDATED ",
    [Tense.Future]: " UPDATE ",
  },
};

/**
 * Creates a log message for file operations of a sync run.
 *
 * @param fileOperation The file operation that should be logged
 * @param tense The tense to use, e.g. create or created
 */
export function createFileOperationLogMessage(
  fileOperation: FileOperation,
  tense: Tense
): string {
  let logPrefix: string;

  switch (fileOperation.type) {
    case FileOperationType.Delete:
    case FileOperationType.DeleteSkipped:
      logPrefix = chalk.inverse.red.bold(operationVerbs.delete[tense]);
      break;
    case FileOperationType.Place:
      logPrefix = chalk.inverse.green.bold(operationVerbs.place[tense]);
      break;
    case FileOperationType.Update:
    case FileOperationType.UpdateWithPrompt:
      logPrefix = chalk.inverse.blueBright.bold(operationVerbs.update[tense]);
      break;
    // The default case is only required to let TypeScript throw
    // compiler errors if a new FileOperationType is added
    /* istanbul ignore next */
    default: {
      const unhandledFileOperation: never = fileOperation;
      throw new Error(
        `Unhandled type for file operation: ${unhandledFileOperation}`
      );
    }
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
