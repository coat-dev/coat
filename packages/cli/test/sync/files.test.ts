import { promises as fs } from "fs";
import path from "path";
import { runSyncTest, prepareCliTest } from "../utils/run-cli-test";
import { runCli } from "../utils/run-cli";
import {
  CoatManifestFileType,
  CoatManifestFileContentTypesMap,
} from "../../src/types/coat-manifest-file";

describe("coat sync - files", () => {
  const testPackagesPath = path.join(__dirname, "..", "utils", "test-packages");

  test("should work with a single template without files", async () => {
    const { task } = await runSyncTest({
      coatManifest: {
        name: "project",
        files: [],
      },
    });
    await task;
  });

  test("should merge a file from multiple stages", async () => {
    const { cwd, task } = await runSyncTest({
      coatManifest: {
        name: "project",
        extends: [
          "local-files-1",
          "local-files-2",
          "local-files-3",
        ].map((templateName) => path.join(testPackagesPath, templateName)),
      },
    });
    await task;

    const [folderContent, aJson, bTxt, cTxt, gitignore] = await Promise.all([
      fs.readdir(cwd),
      fs.readFile(path.join(cwd, "a.json"), "utf8"),
      fs.readFile(path.join(cwd, "b.txt"), "utf8"),
      fs.readFile(path.join(cwd, "c.txt"), "utf8"),
      fs.readFile(path.join(cwd, ".gitignore"), "utf8"),
    ]);

    expect(folderContent).toMatchInlineSnapshot(`
      Array [
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
      Object {
        "firstProperty": Object {
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
    await task;

    const aJson = await fs.readFile(path.join(cwd, "a.json"), "utf8");
    expect(JSON.parse(aJson)).toMatchInlineSnapshot(`
      Object {
        "firstProperty": Object {
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
        extends: [
          "local-files-1",
          "local-files-2",
          "local-files-3",
        ].map((templateName) => path.join(testPackagesPath, templateName)),
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
    await task;

    const [aJson, bTxt] = await Promise.all([
      fs.readFile(path.join(cwd, "a.json"), "utf8"),
      fs.readFile(path.join(cwd, "b.txt"), "utf8"),
    ]);

    expect(JSON.parse(aJson)).toMatchInlineSnapshot(`
      Object {
        "firstProperty": Object {
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
    await task;

    const [aJson, bTxt] = await Promise.all([
      fs.readFile(path.join(cwd, "a.json"), "utf8"),
      fs.readFile(path.join(cwd, "b.txt"), "utf8"),
    ]);

    expect(JSON.parse(aJson)).toMatchInlineSnapshot(`
      Object {
        "arrayProperty": Array [
          null,
          "d",
        ],
        "firstProperty": Object {
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
    await task;

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
    await task;

    const [aJson, bTxt, cTxt, dYaml] = await Promise.all([
      fs.readFile(path.join(cwd, "a.json"), "utf8"),
      fs.readFile(path.join(cwd, "b.txt"), "utf8"),
      fs.readFile(path.join(cwd, "c.txt"), "utf8"),
      fs.readFile(path.join(cwd, "d.yaml"), "utf8"),
    ]);

    // JSON files are formatted via prettier
    expect(aJson).toMatchInlineSnapshot(`
      "{
        \\"bool\\": true,
        \\"long array\\": [
          {
            \\"x\\": 1,
            \\"y\\": 2
          },
          {
            \\"x\\": 2,
            \\"y\\": 1
          },
          {
            \\"x\\": 1,
            \\"y\\": 1
          },
          {
            \\"x\\": 2,
            \\"y\\": 2
          }
        ],
        \\"short array\\": [1, 2, 3]
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
          \\"y\\": 2
        - x: 2
          \\"y\\": 1
        - x: 1
          \\"y\\": 1
        - x: 2
          \\"y\\": 2
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
    await firstSyncRun;

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
    await secondSyncRun;

    // Read files
    const [aRaw, bRaw] = await Promise.all([
      fs.readFile(path.join(cwd, "a.json"), "utf-8"),
      fs.readFile(path.join(cwd, "b.json"), "utf-8"),
    ]);
    expect(JSON.parse(aRaw)).toMatchInlineSnapshot(`
      Object {
        "modifiedGlobal": true,
      }
    `);

    expect(JSON.parse(bRaw)).toMatchInlineSnapshot(`
      Object {
        "modifiedLocal": true,
      }
    `);
  });

  // Add once JavaScript files are added or JSON formatting is
  // different across prettier versions
  test.todo("should polish files using the local prettier version");
});
