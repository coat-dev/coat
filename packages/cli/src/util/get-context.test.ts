import { promises as fs } from "fs";
import path from "path";
import { vol } from "memfs";
import { getContext } from "./get-context";

jest.mock("fs");

describe("util/get-context", () => {
  afterEach(() => {
    vol.reset();
  });

  async function createTestContextFiles(
    cwd: string,
    coatManifest: unknown,
    packageJson: unknown
  ): Promise<void> {
    await fs.mkdir(cwd);
    await Promise.all([
      fs.writeFile(path.join(cwd, "coat.json"), JSON.stringify(coatManifest)),
      fs.writeFile(path.join(cwd, "package.json"), JSON.stringify(packageJson)),
    ]);
  }

  test("should read and parse the coatManifest in a directory", async () => {
    const testCwd = "/test";
    const coatManifest = {
      name: "hi",
      dependencies: {},
      extends: [],
      files: [],
      scripts: [],
    };
    const packageJson = {
      name: "hi",
      version: "1.0.0",
    };
    await createTestContextFiles(testCwd, coatManifest, packageJson);
    const context = await getContext(testCwd);
    expect(context.coatManifest).toEqual(coatManifest);
  });

  test("should read and parse the packageJson in a directory", async () => {
    const testCwd = "/test";
    const coatManifest = {
      name: "hi",
      dependencies: {},
      extends: [],
      files: [],
      scripts: [],
    };
    const packageJson = {
      name: "hi",
      version: "1.0.0",
    };
    await createTestContextFiles(testCwd, coatManifest, packageJson);
    const context = await getContext(testCwd);
    expect(context.packageJson).toEqual(packageJson);
  });

  test("should convert coat manifest into strict manifest", async () => {
    const testCwd = "/test";
    const coatManifest = {
      name: "hi",
    };
    const packageJson = {
      name: "hi",
      version: "1.0.0",
    };
    await createTestContextFiles(testCwd, coatManifest, packageJson);
    const context = await getContext(testCwd);
    expect(context.coatManifest).toEqual({
      name: "hi",
      scripts: [],
      dependencies: {},
      extends: [],
      files: [],
    });
  });

  test("should include cwd in result object", async () => {
    const testCwd = "/test";
    const coatManifest = {
      name: "hi",
      dependencies: {},
      extends: [],
      files: [],
      scripts: [],
    };
    const packageJson = {
      name: "hi",
      version: "1.0.0",
    };
    await createTestContextFiles(testCwd, coatManifest, packageJson);
    const context = await getContext(testCwd);
    expect(context.cwd).toEqual(testCwd);
  });
});
