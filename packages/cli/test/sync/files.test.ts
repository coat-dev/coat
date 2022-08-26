import { promises as fs } from "fs";
import path from "path";
import { runSyncTest, prepareCliTest } from "../utils/run-cli-test";
import { runCli } from "../utils/run-cli";
import {
  CoatManifestFileType,
  CoatManifestFileContentTypesMap,
} from "../../src/types/coat-manifest-file";
import stripAnsi from "strip-ansi";
import { PACKAGE_JSON_FILENAME } from "../../src/constants";

describe("coat sync - files", () => {
  const testPackagesPath = path.join(__dirname, "..", "utils", "test-packages");

  test("should work with a single template without files", async () => {
    const { task } = await runSyncTest({
      coatManifest: {
        name: "project",
        files: [],
      },
    });
    const result = await task;
    expect(stripAnsi(result.stdout)).toMatchInlineSnapshot(`
      "
        CREATED  .gitignore
        UPDATED  package.json
      "
    `);
  });

  test("should merge a file from multiple stages", async () => {
    const { cwd, task } = await runSyncTest({
      coatManifest: {
        name: "project",
        extends: ["local-files-1", "local-files-2", "local-files-3"].map(
          (templateName) => path.join(testPackagesPath, templateName)
        ),
      },
    });
    const result = await task;
    expect(stripAnsi(result.stdout)).toMatchInlineSnapshot(`
      "
        CREATED  .gitignore
        CREATED  a.json
        CREATED  b.txt
        CREATED  c.txt
        UPDATED  package.json
      "
    `);

    const [folderContent, aJson, bTxt, cTxt, gitignore] = await Promise.all([
      fs.readdir(cwd),
      fs.readFile(path.join(cwd, "a.json"), "utf8"),
      fs.readFile(path.join(cwd, "b.txt"), "utf8"),
      fs.readFile(path.join(cwd, "c.txt"), "utf8"),
      fs.readFile(path.join(cwd, ".gitignore"), "utf8"),
    ]);

    expect(folderContent).toMatchInlineSnapshot(`
      [
        ".gitignore",
        "a.json",
        "b.txt",
        "c.txt",
        "coat.json",
        "coat.lock",
        "package.json",
      ]
    `);

    expect(JSON.parse(aJson)).toMatchInlineSnapshot(`
      {
        "firstProperty": {
          "a": true,
          "b": true,
          "c": true,
        },
        "secondProperty": 987,
      }
    `);

    expect(bTxt).toMatchInlineSnapshot(`
      "Text from local-files-3
      "
    `);

    expect(cTxt).toMatchInlineSnapshot(`
      "Text from local-files-3
      "
    `);

    expect(gitignore).toMatchInlineSnapshot(`
      "node_modules

      # coat local files
      /.coat
      "
    `);
  });

  test("should merge from multiple stages with null in-between", async () => {
    const { cwd, task } = await runSyncTest({
      coatManifest: {
        name: "project",
        extends: [
          "local-files-1",
          "local-files-4",
          "local-files-2",
          "local-files-3",
        ].map((templateName) => path.join(testPackagesPath, templateName)),
      },
    });
    const result = await task;
    expect(stripAnsi(result.stdout)).toMatchInlineSnapshot(`
      "
        CREATED  .gitignore
        CREATED  a.json
        CREATED  b.txt
        CREATED  c.txt
        UPDATED  package.json
      "
    `);

    const aJson = await fs.readFile(path.join(cwd, "a.json"), "utf8");
    expect(JSON.parse(aJson)).toMatchInlineSnapshot(`
      {
        "firstProperty": {
          "b": true,
          "c": true,
        },
        "secondProperty": 987,
      }
    `);
  });

  test("should merge from multiple stages with customization file afterwards - customization function", async () => {
    const cwd = await prepareCliTest({
      coatManifest: {
        name: "project",
        extends: ["local-files-1", "local-files-2", "local-files-3"].map(
          (templateName) => path.join(testPackagesPath, templateName)
        ),
      },
    });

    // Copy customization files to target directory
    await Promise.all([
      fs.copyFile(
        path.join(
          testPackagesPath,
          "customization-files-1",
          "a.json-custom.js"
        ),
        path.join(cwd, "a.json-custom.js")
      ),
      fs.copyFile(
        path.join(testPackagesPath, "customization-files-1", "b.txt-custom.js"),
        path.join(cwd, "b.txt-custom.js")
      ),
    ]);

    const { task } = runCli(["sync"], { cwd });
    const result = await task;
    expect(stripAnsi(result.stdout)).toMatchInlineSnapshot(`
      "
        CREATED  .gitignore
        CREATED  a.json
        CREATED  b.txt
        CREATED  c.txt
        UPDATED  package.json
      "
    `);

    const [aJson, bTxt] = await Promise.all([
      fs.readFile(path.join(cwd, "a.json"), "utf8"),
      fs.readFile(path.join(cwd, "b.txt"), "utf8"),
    ]);

    expect(JSON.parse(aJson)).toMatchInlineSnapshot(`
      {
        "firstProperty": {
          "customa": false,
          "customb": false,
          "customc": false,
        },
        "secondProperty": 1987,
        "thirdProperty": null,
      }
    `);

    expect(bTxt).toMatchInlineSnapshot(`
      "3-selif-lacol morf txeT
      "
    `);
  });

  test("should merge from multiple stages with customization file afterwards - customization export", async () => {
    const cwd = await prepareCliTest({
      coatManifest: {
        name: "project",
        extends: [
          "local-files-1",
          "local-files-2",
          "local-files-3",
          "local-files-5",
        ].map((templateName) => path.join(testPackagesPath, templateName)),
      },
    });

    // Copy customization files to target directory
    await Promise.all([
      fs.copyFile(
        path.join(
          testPackagesPath,
          "customization-files-2",
          "a.json-custom.js"
        ),
        path.join(cwd, "a.json-custom.js")
      ),
      fs.copyFile(
        path.join(testPackagesPath, "customization-files-2", "b.txt-custom.js"),
        path.join(cwd, "b.txt-custom.js")
      ),
    ]);

    const { task } = runCli(["sync"], { cwd });
    const result = await task;
    expect(stripAnsi(result.stdout)).toMatchInlineSnapshot(`
      "
        CREATED  .gitignore
        CREATED  a.json
        CREATED  b.txt
        CREATED  c.txt
        UPDATED  package.json
      "
    `);

    const [aJson, bTxt] = await Promise.all([
      fs.readFile(path.join(cwd, "a.json"), "utf8"),
      fs.readFile(path.join(cwd, "b.txt"), "utf8"),
    ]);

    expect(JSON.parse(aJson)).toMatchInlineSnapshot(`
      {
        "arrayProperty": [
          null,
          "d",
        ],
        "firstProperty": {
          "a": true,
          "b": true,
          "c": true,
          "d": true,
        },
        "secondProperty": 987,
        "thirdProperty": null,
      }
    `);

    expect(bTxt).toMatchInlineSnapshot(`
      "New text
      "
    `);
  });

  test("should merge from multiple stages with no placed file that has a customization file", async () => {
    const cwd = await prepareCliTest({
      coatManifest: {
        name: "project",
        extends: [
          "local-files-1",
          "local-files-2",
          "local-files-3",
          "local-files-5",
          "local-files-4",
        ].map((templateName) => path.join(testPackagesPath, templateName)),
      },
    });

    // Copy customization files to target directory
    await fs.copyFile(
      path.join(testPackagesPath, "customization-files-2", "a.json-custom.js"),
      path.join(cwd, "a.json-custom.js")
    );

    const { task } = runCli(["sync"], { cwd });
    const result = await task;
    expect(stripAnsi(result.stdout)).toMatchInlineSnapshot(`
      "
        CREATED  .gitignore
        CREATED  b.txt
        CREATED  c.txt
        UPDATED  package.json
      "
    `);

    await expect(() =>
      fs.readFile(path.join(cwd, "a.json"), "utf8")
    ).rejects.toHaveProperty(
      "message",
      expect.stringMatching(
        /ENOENT: no such file or directory, open '.*a.json'$/
      )
    );
  });

  test("should polish multiple files", async () => {
    const files: {
      [type in CoatManifestFileType]: CoatManifestFileContentTypesMap[type];
    } = {
      [CoatManifestFileType.Json]: {
        bool: true,
        "short array": [1, 2, 3],
        "long array": [
          { x: 1, y: 2 },
          { x: 2, y: 1 },
          { x: 1, y: 1 },
          { x: 2, y: 2 },
        ],
      },
      [CoatManifestFileType.Text]: "Some Text",
      [CoatManifestFileType.Yaml]: {
        bool: true,
        "short array": [1, 2, 3],
        "long array": [
          { x: 1, y: 2 },
          { x: 2, y: 1 },
          { x: 1, y: 1 },
          { x: 2, y: 2 },
        ],
      },
    };

    const { task, cwd } = await runSyncTest({
      coatManifest: {
        name: "project",
        files: [
          {
            file: "a.json",
            content: files[CoatManifestFileType.Json],
            type: CoatManifestFileType.Json,
          },
          {
            file: "b.txt",
            content: files[CoatManifestFileType.Text],
            type: CoatManifestFileType.Text,
          },
          {
            file: "c.txt",
            content: "Text with multiple trailing newlines\n\n\n",
            type: CoatManifestFileType.Text,
          },
          {
            file: "d.yaml",
            content: files[CoatManifestFileType.Yaml],
            type: CoatManifestFileType.Yaml,
          },
        ],
      },
    });
    const result = await task;
    expect(stripAnsi(result.stdout)).toMatchInlineSnapshot(`
      "
        CREATED  .gitignore
        CREATED  a.json
        CREATED  b.txt
        CREATED  c.txt
        CREATED  d.yaml
        UPDATED  package.json
      "
    `);

    const [aJson, bTxt, cTxt, dYaml] = await Promise.all([
      fs.readFile(path.join(cwd, "a.json"), "utf8"),
      fs.readFile(path.join(cwd, "b.txt"), "utf8"),
      fs.readFile(path.join(cwd, "c.txt"), "utf8"),
      fs.readFile(path.join(cwd, "d.yaml"), "utf8"),
    ]);

    // JSON files are formatted via prettier
    expect(aJson).toMatchInlineSnapshot(`
      "{
        "bool": true,
        "long array": [
          {
            "x": 1,
            "y": 2
          },
          {
            "x": 2,
            "y": 1
          },
          {
            "x": 1,
            "y": 1
          },
          {
            "x": 2,
            "y": 2
          }
        ],
        "short array": [1, 2, 3]
      }
      "
    `);

    // TEXT files have a single trailing new line at the end
    expect(bTxt).toMatchInlineSnapshot(`
      "Some Text
      "
    `);
    expect(cTxt).toMatchInlineSnapshot(`
      "Text with multiple trailing newlines
      "
    `);

    // YAML files are formatted via prettier
    expect(dYaml).toMatchInlineSnapshot(`
      "bool: true
      long array:
        - x: 1
          "y": 2
        - x: 2
          "y": 1
        - x: 1
          "y": 1
        - x: 2
          "y": 2
      short array:
        - 1
        - 2
        - 3
      "
    `);
  });

  test("should not touch files that are only generated once again after they have been placed", async () => {
    const { cwd, task: firstSyncRun } = await runSyncTest({
      coatManifest: {
        name: "test",
        extends: ["local-files-6", "local-files-7"].map((template) =>
          path.join(testPackagesPath, template)
        ),
      },
    });
    const firstSyncResult = await firstSyncRun;
    expect(stripAnsi(firstSyncResult.stdout)).toMatchInlineSnapshot(`
      "
        CREATED  .gitignore
        CREATED  a.json
        CREATED  b.json
        UPDATED  package.json
      "
    `);

    // Modify files
    await Promise.all([
      fs.writeFile(
        path.join(cwd, "a.json"),
        JSON.stringify({ modifiedGlobal: true })
      ),
      fs.writeFile(
        path.join(cwd, "b.json"),
        JSON.stringify({ modifiedLocal: true })
      ),
    ]);

    // Run sync again to verify that files will not be changed
    const { task: secondSyncRun } = runCli(["sync"], { cwd });
    const secondSyncResult = await secondSyncRun;
    expect(stripAnsi(secondSyncResult.stdout)).toMatchInlineSnapshot(`
      "
      ♻️ Everything up to date
      "
    `);

    // Read files
    const [aRaw, bRaw] = await Promise.all([
      fs.readFile(path.join(cwd, "a.json"), "utf-8"),
      fs.readFile(path.join(cwd, "b.json"), "utf-8"),
    ]);
    expect(JSON.parse(aRaw)).toMatchInlineSnapshot(`
      {
        "modifiedGlobal": true,
      }
    `);

    expect(JSON.parse(bRaw)).toMatchInlineSnapshot(`
      {
        "modifiedLocal": true,
      }
    `);
  });

  test("should not touch files that have existed before in the project", async () => {
    const cwd = await prepareCliTest({
      coatManifest: {
        name: "test",
        extends: ["local-files-6", "local-files-7"].map((template) =>
          path.join(testPackagesPath, template)
        ),
      },
    });

    // Place once files before syncing
    await Promise.all([
      fs.writeFile(
        path.join(cwd, "a.json"),
        JSON.stringify({ globalBeforeSync: true })
      ),
      fs.writeFile(
        path.join(cwd, "b.json"),
        JSON.stringify({ localBeforeSync: true })
      ),
    ]);

    // Run sync
    const { task } = runCli(["sync"], { cwd });
    await task;

    // Read files
    const [aRaw, bRaw] = await Promise.all([
      fs.readFile(path.join(cwd, "a.json"), "utf-8"),
      fs.readFile(path.join(cwd, "b.json"), "utf-8"),
    ]);
    expect(JSON.parse(aRaw)).toMatchInlineSnapshot(`
      {
        "globalBeforeSync": true,
      }
    `);

    expect(JSON.parse(bRaw)).toMatchInlineSnapshot(`
      {
        "localBeforeSync": true,
      }
    `);
  });

  test("should generate a package.json file if it did not exist before but package.json properties were added by the project", async () => {
    const cwd = await prepareCliTest({
      coatManifest: {
        name: "test",
        scripts: [
          {
            id: "test",
            run: "echo test",
            scriptName: "test",
          },
        ],
      },
    });

    // Remove the package.json file that has been placed by default
    await fs.unlink(path.join(cwd, PACKAGE_JSON_FILENAME));

    // Run sync
    const { task } = runCli(["sync"], { cwd });
    const result = await task;
    expect(stripAnsi(result.stdout)).toMatchInlineSnapshot(`
      "
        CREATED  .gitignore
        CREATED  package.json
      "
    `);

    const packageJsonRaw = await fs.readFile(
      path.join(cwd, PACKAGE_JSON_FILENAME),
      "utf-8"
    );
    const packageJson = JSON.parse(packageJsonRaw);

    expect(packageJson).toEqual({
      scripts: {
        test: "echo test",
      },
    });
  });

  // Add once JavaScript files are added or JSON formatting is
  // different across prettier versions
  test.todo("should polish files using the local prettier version");
});
