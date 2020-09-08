import { generateLockfileFiles } from "./generate-lockfile-files";

describe("lockfiles/generate-lockfile-files", () => {
  test("should return an empty array for an empty files input", () => {
    expect(generateLockfileFiles([])).toEqual([]);
  });

  test('should have the correct "once" property for input files', () => {
    const files = [
      {
        relativePath: "file.json",
      },
      {
        relativePath: "file2.json",
        once: false,
      },
      {
        relativePath: "file3.json",
        once: true,
      },
    ];
    // @ts-expect-error
    const result = generateLockfileFiles(files);
    expect(result[0]).toHaveProperty("once", false);
    expect(result[1]).toHaveProperty("once", false);
    expect(result[2]).toHaveProperty("once", true);
  });

  test("should use relative paths for all files", () => {
    const files = [
      {
        relativePath: "file.json",
      },
      {
        relativePath: "file2.json",
      },
      {
        relativePath: "file3.json",
      },
    ];
    // @ts-expect-error
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
    const files = [
      {
        relativePath: "file3.json",
      },
      {
        relativePath: "file2.json",
      },
      {
        relativePath: "file.json",
      },
    ];
    // @ts-expect-error
    const result = generateLockfileFiles(files);
    expect(result.map((file) => file.path)).toMatchInlineSnapshot(`
      Array [
        "file.json",
        "file2.json",
        "file3.json",
      ]
    `);
  });
});
