import { promises as fs } from "fs";
import path from "path";
import fsExtra from "fs-extra";
import { runSyncTest, prepareCliTest } from "../utils/run-cli-test";
import { CoatManifestFileType } from "../../src/types/coat-manifest-file";
import { PACKAGE_JSON_FILENAME } from "../../src/constants";
import { runCli } from "../utils/run-cli";

describe("coat sync - scripts", () => {
  test("should work with a template with an empty scripts entry", async () => {
    const filePath = "file.json";
    const fileContent = "Hello coat\n";
    const { cwd, task } = await runSyncTest({
      coatManifest: {
        name: "test-project",
        files: [
          {
            content: fileContent,
            file: filePath,
            type: CoatManifestFileType.Text,
          },
        ],
        scripts: [],
      },
    });
    await task;

    const diskFileContent = await fs.readFile(path.join(cwd, filePath), "utf8");
    expect(diskFileContent).toBe(fileContent);
  });

  test("should override existing scripts", async () => {
    const projectName = "test-project";
    const { cwd, task } = await runSyncTest({
      coatManifest: {
        name: projectName,
        scripts: [
          {
            id: "lint",
            run: "overridden",
            scriptName: "lint",
          },
        ],
      },
      packageJson: {
        name: projectName,
        scripts: {
          lint: "before-sync",
        },
      },
    });
    await task;

    const packageJsonContent = await fs.readFile(
      path.join(cwd, PACKAGE_JSON_FILENAME),
      "utf8"
    );
    expect(JSON.parse(packageJsonContent)).toEqual({
      name: projectName,
      scripts: {
        lint: "overridden",
      },
    });
  });

  test("should merge scripts from templates", async () => {
    const localTemplates = [
      "local-template-sync-scripts-1",
      "local-template-sync-scripts-2",
    ];

    const cwd = await prepareCliTest({
      coatManifest: {
        name: "test-project",
        extends: [
          // template adds a build script with "babel"
          `./${localTemplates[0]}`,
          // template adds a lint script
          `./${localTemplates[1]}`,
        ],
        scripts: [
          // Add build script to merge with existing babel build script
          {
            id: "build-typescript",
            run: "tsc",
            scriptName: "build",
          },
        ],
      },
    });

    // Copy local templates into project folder
    await Promise.all(
      localTemplates.map((localTemplate) =>
        fsExtra.copy(
          path.join(__dirname, "..", "utils", "test-packages", localTemplate),
          path.join(cwd, localTemplate)
        )
      )
    );

    const { task } = runCli(["sync"], cwd);
    await task;

    const packageJsonContent = await fs.readFile(
      path.join(cwd, PACKAGE_JSON_FILENAME),
      "utf8"
    );
    expect(JSON.parse(packageJsonContent)).toEqual({
      name: "test-project",
      version: "1.0.0",
      scripts: {
        build: "run-p build:*",
        "build:babel": "babel",
        "build:typescript": "tsc",
        lint: "eslint",
      },
    });
  });

  test("should keep existing scripts", async () => {
    const projectName = "test-project";
    const { cwd, task } = await runSyncTest({
      packageJson: {
        name: projectName,
        scripts: {
          existingScript: "existing",
        },
      },
      coatManifest: {
        name: projectName,
        scripts: [
          {
            id: "1",
            run: "new",
            scriptName: "newScript",
          },
        ],
      },
    });
    await task;

    const packageJsonContent = await fs.readFile(
      path.join(cwd, PACKAGE_JSON_FILENAME),
      "utf8"
    );
    expect(JSON.parse(packageJsonContent)).toEqual({
      name: projectName,
      scripts: {
        existingScript: "existing",
        newScript: "new",
      },
    });
  });
});
