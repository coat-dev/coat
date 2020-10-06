import { promises as fs } from "fs";
import path from "path";
import { COAT_MANIFEST_FILENAME } from "../../src/constants";
import { runCli } from "../utils/run-cli";
import { runSyncTest } from "../utils/run-cli-test";

describe("sync/template-config", () => {
  const testPackagesPath = path.join(__dirname, "..", "utils", "test-packages");
  const localTemplateWithConfig = path.join(
    testPackagesPath,
    "local-template-with-config-1"
  );

  test("should generate files based on template config", async () => {
    // Sync with a first config variation
    const { cwd, task: firstSyncRun } = await runSyncTest({
      coatManifest: {
        name: "test",
        extends: [
          [
            localTemplateWithConfig,
            { filePrefix: "first-prefix", content: "first-content" },
          ],
        ],
      },
    });
    await firstSyncRun;

    // Read files and verify the first config was applied
    let [folderEntries, aJsonRaw, staticJsonRaw] = await Promise.all([
      fs.readdir(cwd),
      fs.readFile(path.join(cwd, "first-prefix-a.json"), "utf-8"),
      fs.readFile(path.join(cwd, "static.json"), "utf-8"),
    ]);

    expect(folderEntries).toEqual([
      ".gitignore",
      "coat.json",
      "coat.lock",
      "first-prefix-a.json",
      "package.json",
      "static.json",
    ]);

    let aJson = JSON.parse(aJsonRaw);
    let staticJson = JSON.parse(staticJsonRaw);

    expect(aJson).toEqual({
      value: "first-content",
    });
    expect(staticJson).toEqual({
      value: "first-content",
    });

    // Modify config in coat.json
    await fs.writeFile(
      path.join(cwd, COAT_MANIFEST_FILENAME),
      JSON.stringify({
        name: "test",
        extends: [
          [
            localTemplateWithConfig,
            { filePrefix: "second-prefix", content: "second-content" },
          ],
        ],
      })
    );

    // Run sync again
    const { task: secondSyncRun } = runCli(["sync"], { cwd });
    await secondSyncRun;

    // Read files again and verify they have been updated
    [folderEntries, aJsonRaw, staticJsonRaw] = await Promise.all([
      fs.readdir(cwd),
      fs.readFile(path.join(cwd, "second-prefix-a.json"), "utf-8"),
      fs.readFile(path.join(cwd, "static.json"), "utf-8"),
    ]);

    expect(folderEntries).toEqual([
      ".gitignore",
      "coat.json",
      "coat.lock",
      "package.json",
      "second-prefix-a.json",
      "static.json",
    ]);

    aJson = JSON.parse(aJsonRaw);
    staticJson = JSON.parse(staticJsonRaw);

    expect(aJson).toEqual({
      value: "second-content",
    });
    expect(staticJson).toEqual({
      value: "second-content",
    });
  });
});
