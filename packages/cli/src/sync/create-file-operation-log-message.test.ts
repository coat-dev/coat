import chalk from "chalk";
import {
  createFileOperationLogMessage,
  Tense,
} from "./create-file-operation-log-message";
import { FileOperationType } from "./get-file-operations";

describe("sync/create-file-operation-log-message", () => {
  const testOperation = {
    absolutePath: "TEST",
    relativePath: "folder-1/file.json",
    content: "TEST",
    local: false,
  };

  describe("past tense", () => {
    test("should log delete operation correctly", () => {
      const result = createFileOperationLogMessage(
        {
          ...testOperation,
          type: FileOperationType.Delete,
        },
        Tense.Past
      );
      const expectedResult = ` ${chalk.inverse.red.bold(" DELETED ")} ${
        testOperation.relativePath
      }`;
      expect(result).toBe(expectedResult);
    });

    test("should log skipped delete operation correctly", () => {
      const result = createFileOperationLogMessage(
        {
          ...testOperation,
          type: FileOperationType.DeleteSkipped,
        },
        Tense.Past
      );
      const expectedResult = chalk.dim(
        ` ${chalk.inverse.red.bold(" DELETED ")} (skipped - ${
          testOperation.relativePath
        })`
      );
      expect(result).toBe(expectedResult);
    });

    test("should log create operation correctly", () => {
      const result = createFileOperationLogMessage(
        {
          ...testOperation,
          type: FileOperationType.Place,
        },
        Tense.Past
      );
      const expectedResult = ` ${chalk.inverse.green.bold(" CREATED ")} ${
        testOperation.relativePath
      }`;
      expect(result).toBe(expectedResult);
    });

    test("should log update operation correctly", () => {
      const result = createFileOperationLogMessage(
        {
          ...testOperation,
          type: FileOperationType.Update,
        },
        Tense.Past
      );
      const expectedResult = ` ${chalk.inverse.blueBright.bold(" UPDATED ")} ${
        testOperation.relativePath
      }`;
      expect(result).toBe(expectedResult);
    });
  });

  describe("future tense", () => {
    test("should log delete operation correctly", () => {
      const result = createFileOperationLogMessage(
        {
          ...testOperation,
          type: FileOperationType.Delete,
        },
        Tense.Future
      );
      const expectedResult = ` ${chalk.inverse.red.bold(" DELETE ")} ${
        testOperation.relativePath
      }`;
      expect(result).toBe(expectedResult);
    });

    test("should log skipped delete operation correctly", () => {
      const result = createFileOperationLogMessage(
        {
          ...testOperation,
          type: FileOperationType.DeleteSkipped,
        },
        Tense.Future
      );
      const expectedResult = chalk.dim(
        ` ${chalk.inverse.red.bold(" DELETE ")} (skipped - ${
          testOperation.relativePath
        })`
      );
      expect(result).toBe(expectedResult);
    });

    test("should log create operation correctly", () => {
      const result = createFileOperationLogMessage(
        {
          ...testOperation,
          type: FileOperationType.Place,
        },
        Tense.Future
      );
      const expectedResult = ` ${chalk.inverse.green.bold(" CREATE ")} ${
        testOperation.relativePath
      }`;
      expect(result).toBe(expectedResult);
    });

    test("should log update operation correctly", () => {
      const result = createFileOperationLogMessage(
        {
          ...testOperation,
          type: FileOperationType.Update,
        },
        Tense.Future
      );
      const expectedResult = ` ${chalk.inverse.blueBright.bold(" UPDATE ")} ${
        testOperation.relativePath
      }`;
      expect(result).toBe(expectedResult);
    });
  });
});
