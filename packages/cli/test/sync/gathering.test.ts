import { promises as fs } from "fs";
import fsExtra from "fs-extra";
import path from "path";
import { cleanupTmpDirs } from "../utils/get-tmp-dir";
import { runSyncTest, prepareSyncTest } from "../utils/run-sync-test";
import { CoatManifestFileType } from "../../src/types/coat-manifest-file";
import { runCli } from "../utils/run-cli";
import execa from "execa";
import fromPairs from "lodash/fromPairs";

jest.setTimeout(60000);

afterAll(() => {
  cleanupTmpDirs();
});

describe("coat sync - gathering", () => {
  test("should work with a template with an empty extends entry", async () => {
    const fileContent = "test\n";
    const filePath = "file.txt";
    const { cwd, task } = await runSyncTest({
      coatManifest: {
        name: "project",
        extends: [],
        files: [
          {
            content: fileContent,
            file: filePath,
            type: CoatManifestFileType.Text,
          },
        ],
      },
    });

    await task;

    const diskFileContent = await fs.readFile(path.join(cwd, filePath), "utf8");
    expect(diskFileContent).toBe(fileContent);
  });

  test("should work with local templates that are extending installed templates", async () => {
    // Template tree:
    // local-template-1
    // -- @coat/integration-test-template-sync-1@1.0.0
    // local-template-1
    // -- @coat/integration-test-template-sync-2@1.0.0

    // Retrieve a temporary directory
    const projectName = "test-project";
    const templates = ["local-template-1", "local-template-2"];
    const tmpDir = await prepareSyncTest({
      coatManifest: {
        name: projectName,
        extends: templates.map((template) => `./${template}`),
      },
      packageJson: {
        name: projectName,
        version: "1.0.0",
        devDependencies: {
          "@coat/integration-test-template-sync-1":
            "github:coat-dev/cli-integration-tests-template#coat/integration-test-template-sync-1-v1.0.0",
          "@coat/integration-test-template-sync-2":
            "github:coat-dev/cli-integration-tests-template#coat/integration-test-template-sync-2-v1.0.0",
        },
      },
    });

    // Copy two local templates in target folder that depend on two installed templates
    await Promise.all(
      templates.map((template) =>
        fsExtra.copy(
          path.join(__dirname, "..", "utils", "test-packages", template),
          path.join(tmpDir, template),
          { recursive: true }
        )
      )
    );
    // Run npm install in folder
    await execa("npm", ["install"], { cwd: tmpDir });

    const { task } = runCli(["sync"], tmpDir);
    await task;

    // Verify that files that are created by the installed templates
    // that the local templates are dependent on are created
    const [template1File, template2File] = await Promise.all(
      templates.map((_, index) =>
        fs.readFile(
          path.join(tmpDir, `integration-test-template-sync-${index + 1}`),
          "utf-8"
        )
      )
    );
    expect(JSON.parse(template1File)).toEqual({ a: 1 });
    expect(JSON.parse(template2File)).toEqual({ b: 1 });
  });

  test("should work with nested installed templates, that require the same template in different versions", async () => {
    // Template tree:
    // @coat/integration-test-template-sync-4@1.0.0
    // -- @coat/integration-test-template-sync-3@1.0.0
    // @coat/integration-test-template-sync-5@1.0.0
    // -- @coat/integration-test-template-sync-3@2.0.0

    // Retrieve a temporary directory
    const projectName = "test-project";
    const templates = [
      "@coat/integration-test-template-sync-4",
      "@coat/integration-test-template-sync-5",
    ];
    const tmpDir = await prepareSyncTest({
      coatManifest: {
        name: projectName,
        extends: templates,
      },
      packageJson: {
        name: projectName,
        version: "1.0.0",
        devDependencies: fromPairs(
          templates.map((template) => [
            template,
            // Remove "@" from template name to form git tag
            `github:coat-dev/cli-integration-tests-template#${template.substr(
              1
            )}-v1.0.0`,
          ])
        ),
      },
    });

    // Run npm install in folder
    await execa("npm", ["install"], { cwd: tmpDir });

    const { task } = runCli(["sync"], tmpDir);
    await task;

    // Verify that files that are created by the installed templates
    // that the local templates are dependent on are created
    const templateFiles = await Promise.all([
      fs.readFile(
        path.join(tmpDir, "integration-test-template-sync-3-1.0.0"),
        "utf-8"
      ),
      fs.readFile(
        path.join(tmpDir, "integration-test-template-sync-3-2.0.0"),
        "utf-8"
      ),
      fs.readFile(
        path.join(tmpDir, "integration-test-template-sync-4"),
        "utf-8"
      ),
      fs.readFile(
        path.join(tmpDir, "integration-test-template-sync-5"),
        "utf-8"
      ),
    ]);

    templateFiles.forEach((templateFile) => {
      expect(JSON.parse(templateFile)).toEqual({ b: 1 });
    });
  });
});