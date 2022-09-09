import path from "path";
import { PolishedFile } from "../sync/polish-files";
import { CoatManifestFileType } from "../types/coat-manifest-file";
import { getFileHash } from "../util/get-file-hash";
import { generateLockfileFiles } from "./generate-lockfile-files";

const platformRoot = path.parse(process.cwd()).root;
const testCwd = path.join(platformRoot, "test");

describe("lockfiles/generate-lockfile-files", () => {
  test("should return an empty array for an empty files input", () => {
    expect(generateLockfileFiles([])).toEqual([]);
  });

  test('should have the correct "once" property for input files', () => {
    const files: PolishedFile[] = [
      {
        file: path.join(testCwd, "file.json"),
        relativePath: "file.json",
        content: "file.json",
        hash: getFileHash("file.json"),
        local: false,
        once: false,
        type: CoatManifestFileType.Json,
      },
      {
        file: path.join(testCwd, "file2.json"),
        relativePath: "file2.json",
        content: "file2.json",
        hash: getFileHash("file2.json"),
        local: false,
        once: false,
        type: CoatManifestFileType.Json,
      },
      {
        file: path.join(testCwd, "file3.json"),
        relativePath: "file3.json",
        content: "file3.json",
        local: false,
        once: true,
        type: CoatManifestFileType.Json,
      },
    ];
    const result = generateLockfileFiles(files);
    expect(result[0]).toHaveProperty("once", false);
    expect(result[1]).toHaveProperty("once", false);
    expect(result[2]).toHaveProperty("once", true);
  });

  test("should use relative paths for all files", () => {
    const files: PolishedFile[] = [
      {
        file: path.join(testCwd, "file.json"),
        relativePath: "file.json",
        content: "",
        hash: getFileHash(""),
        local: false,
        once: false,
        type: CoatManifestFileType.Json,
      },
      {
        file: path.join(testCwd, "file2.json"),
        relativePath: "file2.json",
        content: "",
        hash: getFileHash(""),
        local: false,
        once: false,
        type: CoatManifestFileType.Json,
      },
      {
        file: path.join(testCwd, "file3.json"),
        relativePath: "file3.json",
        content: "",
        hash: getFileHash(""),
        local: false,
        once: false,
        type: CoatManifestFileType.Json,
      },
    ];

    const result = generateLockfileFiles(files);
    expect(result[0]).toHaveProperty("path", "file.json");
    expect(result[1]).toHaveProperty("path", "file2.json");
    expect(result[2]).toHaveProperty("path", "file3.json");
  });

  test("should not have the root package.json in the results", () => {
    const files = [
      {
        file: "/cwd/folder-1/package.json",
        relativePath: "package.json",
      },
    ];
    // @ts-expect-error
    const result = generateLockfileFiles(files);
    expect(result).toEqual([]);
  });

  test("should sort files alphabetically by path", () => {
    const files: PolishedFile[] = [
      {
        file: path.join(testCwd, "file3.json"),
        relativePath: "file3.json",
        content: "",
        hash: getFileHash(""),
        local: false,
        once: false,
        type: CoatManifestFileType.Json,
      },
      {
        file: path.join(testCwd, "file2.json"),
        relativePath: "file2.json",
        content: "",
        hash: getFileHash(""),
        local: false,
        once: false,
        type: CoatManifestFileType.Json,
      },
      {
        file: path.join(testCwd, "file.json"),
        relativePath: "file.json",
        content: "",
        hash: getFileHash(""),
        local: false,
        once: false,
        type: CoatManifestFileType.Json,
      },
    ];

    const result = generateLockfileFiles(files);
    expect(result.map((file) => file.path)).toMatchInlineSnapshot(`
      [
        "file.json",
        "file2.json",
        "file3.json",
      ]
    `);
  });

  test("should keep the hash property for continuously managed files", () => {
    const files: PolishedFile[] = [
      {
        file: path.join(testCwd, "file3.json"),
        relativePath: "file3.json",
        content: "",
        hash: getFileHash(""),
        local: false,
        once: false,
        type: CoatManifestFileType.Json,
      },
    ];

    const result = generateLockfileFiles(files);
    expect(result).toEqual([
      {
        path: "file3.json",
        hash: "pp9zzKI6msXItWfcGFp1bpfJghZP4lhZ4NHcwUdcgKYVshI68fX5TBHj6UAsOsVY9QAZnZW20+MBdYWGKB3NJg==",
        once: false,
      },
    ]);
  });

  test("should not have a hash property for once files", () => {
    const files: PolishedFile[] = [
      {
        file: path.join(testCwd, "file3.json"),
        relativePath: "file3.json",
        content: "",
        local: false,
        once: true,
        type: CoatManifestFileType.Json,
      },
    ];

    const result = generateLockfileFiles(files);
    expect(result).toEqual([
      {
        path: "file3.json",
        once: true,
      },
    ]);
  });
});
