import fs from "fs-extra";
import path from "path";
import { vol } from "memfs";
import { deleteFile } from "./delete-file";

jest.mock("fs");

const platformRoot = path.parse(process.cwd()).root;
const testCwd = path.join(platformRoot, "test");

describe("util/delete-file", () => {
  afterEach(() => {
    vol.reset();
  });

  test("should delete file from disk", async () => {
    // Put file on disk that should be removed
    const filePath = path.join(testCwd, "file.txt");
    await fs.outputFile(filePath, "");

    await deleteFile(filePath);

    await expect(fs.readFile(filePath, "utf-8")).rejects.toHaveProperty(
      "message",
      expect.stringMatching(
        /ENOENT: no such file or directory, open '.*file.txt'/
      )
    );
  });

  test("should not throw any error if file is already deleted", async () => {
    const filePath = path.join(testCwd, "file.txt");
    await deleteFile(filePath);

    await expect(fs.readFile(filePath, "utf-8")).rejects.toHaveProperty(
      "message",
      expect.stringMatching(
        /ENOENT: no such file or directory, open '.*file.txt'/
      )
    );
  });
});
