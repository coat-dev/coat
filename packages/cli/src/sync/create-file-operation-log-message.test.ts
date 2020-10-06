import chalk from "chalk";
import { createFileOperationLogMessage } from "./create-file-operation-log-message";
import { FileOperationType } from "./update-files-on-disk";

describe("sync/create-file-operation-log-message", () => {
  const testOperation = {
    absolutePath: "TEST",
    relativePath: "folder-1/file.json",
    content: "TEST",
  };

  test("should log delete operation correctly", () => {
    const result = createFileOperationLogMessage({
      ...testOperation,
      type: FileOperationType.Delete,
    });
    const expectedResult = ` ${chalk.inverse.red.bold(" DELETED ")} ${
      testOperation.relativePath
    }`;
    expect(result).toBe(expectedResult);
  });

  test("should log skipped delete operation correctly", () => {
    const result = createFileOperationLogMessage({
      ...testOperation,
      type: FileOperationType.DeleteSkipped,
    });
    const expectedResult = chalk.dim(
      ` ${chalk.inverse.red.bold(" DELETED ")} (skipped - ${
        testOperation.relativePath
      })`
    );
    expect(result).toBe(expectedResult);
  });

  test("should log create operation correctly", () => {
    const result = createFileOperationLogMessage({
      ...testOperation,
      type: FileOperationType.Place,
    });
    const expectedResult = ` ${chalk.inverse.green.bold(" CREATED ")} ${
      testOperation.relativePath
    }`;
    expect(result).toBe(expectedResult);
  });

  test("should log update operation correctly", () => {
    const result = createFileOperationLogMessage({
      ...testOperation,
      type: FileOperationType.Update,
    });
    const expectedResult = ` ${chalk.inverse.blueBright.bold(" UPDATED ")} ${
      testOperation.relativePath
    }`;
    expect(result).toBe(expectedResult);
  });
});
