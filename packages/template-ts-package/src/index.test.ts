import path from "path";
import fs from "fs-extra";
import tmp from "tmp";
import { sync } from "@coat/cli/build/sync";
import { gatherExtendedTemplates } from "@coat/cli/build/util/gather-extended-templates";
import { getStrictCoatManifest } from "@coat/cli/build/util/get-strict-coat-manifest";
import createTemplate from ".";

// TODO: See #47
// Add more thorough tests and e2e tests
// that don't rely on coat cli internals

jest
  .mock("@coat/cli/build/util/gather-extended-templates")
  .mock("execa")
  .mock("ora");

jest.spyOn(console, "log").mockImplementation(() => {
  // Empty mock function
});

const gatherExtendedTemplatesMock = gatherExtendedTemplates as jest.Mock;
gatherExtendedTemplatesMock.mockImplementation((coatContext) => [
  getStrictCoatManifest(
    typeof createTemplate === "function"
      ? createTemplate({ coatContext, config: {} })
      : createTemplate
  ),
]);

describe("@coat/template-ts-package", () => {
  let testCwd: string;
  let removeCallback: () => void;

  beforeEach(() => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true });
    testCwd = tmpDir.name;
    removeCallback = tmpDir.removeCallback;

    gatherExtendedTemplatesMock.mockImplementation((coatContext) => [
      getStrictCoatManifest(
        typeof createTemplate === "function"
          ? createTemplate({ coatContext, config: {} })
          : createTemplate
      ),
    ]);
  });

  afterEach(() => {
    removeCallback();
  });

  async function verifyFile(
    file: string,
    currentPath: string,
    basePath: string
  ): Promise<void> {
    const stats = await fs.stat(path.join(basePath, currentPath, file));
    if (stats.isDirectory()) {
      const entries = await fs.readdir(path.join(basePath, currentPath, file));
      entries.sort();
      for (const entry of entries) {
        await verifyFile(entry, path.join(currentPath, file), basePath);
      }
    } else {
      const entry = await fs.readFile(
        path.join(basePath, currentPath, file),
        "utf-8"
      );
      const snapshotEntry = [path.join(currentPath, file), "====", entry].join(
        "\n"
      );
      expect(snapshotEntry).toMatchSnapshot();
    }
  }

  test.each`
    description              | config
    ${"default config"}      | ${{}}
    ${"typescript compiler"} | ${{ compiler: "typescript" }}
    ${"babel compiler"}      | ${{ compiler: "babel" }}
  `("template verification - $description", async ({ config }) => {
    await Promise.all([
      fs.outputFile(
        path.join(testCwd, "coat.json"),
        JSON.stringify({ name: "test-project" })
      ),
      fs.outputFile(path.join(testCwd, "package.json"), JSON.stringify({})),
    ]);

    gatherExtendedTemplatesMock.mockImplementation((coatContext) => [
      getStrictCoatManifest(
        typeof createTemplate === "function"
          ? createTemplate({ coatContext, config })
          : createTemplate
      ),
    ]);

    await sync(testCwd);

    const allFiles = await fs.readdir(testCwd);
    allFiles.sort();
    for (const file of allFiles) {
      await verifyFile(file, ".", testCwd);
    }
  });
});
