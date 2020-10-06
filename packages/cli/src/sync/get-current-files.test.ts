import path from "path";
import fs from "fs-extra";
import { vol } from "memfs";
import { getCurrentFiles } from "./get-current-files";

jest.mock("fs");

const platformRoot = path.parse(process.cwd()).root;
const testCwd = path.join(platformRoot, "test");

describe("sync/get-current-files", () => {
  const defaultFiles = {
    [path.join(testCwd, "a.json")]: '{ "A": null }',
    [path.join(testCwd, "b.json")]: '{ "B": null }',
    [path.join(testCwd, "c.txt")]: "Hello C",
  };

  beforeEach(async () => {
    await Promise.all(
      Object.entries(defaultFiles).map(([file, content]) =>
        fs.outputFile(file, content)
      )
    );
  });

  afterEach(() => {
    vol.reset();
  });

  test("should return the content for all files", async () => {
    const result = await getCurrentFiles(Object.keys(defaultFiles));
    expect(result).toEqual(defaultFiles);
  });

  test("should return undefined if file does not exist", async () => {
    // Remove b.json
    const bJsonPath = path.join(testCwd, "b.json");
    await fs.unlink(bJsonPath);

    const result = await getCurrentFiles(Object.keys(defaultFiles));
    expect(result).toEqual({
      ...defaultFiles,
      [bJsonPath]: undefined,
    });
  });

  test("should throw error if file cannot be accessed", async () => {
    // Modify b.json permissions
    const bJsonPath = path.join(testCwd, "b.json");
    await fs.chmod(bJsonPath, 0o000);

    await expect(() =>
      getCurrentFiles(Object.keys(defaultFiles))
    ).rejects.toHaveProperty(
      "message",
      expect.stringMatching(/EACCES: permission denied, open '.*b.json'/)
    );
  });
});
