import fs from "fs-extra";
import path from "path";
import execa from "execa";
import { vol } from "memfs";
import yaml from "js-yaml";
import { sync } from ".";
import { gatherExtendedTemplates } from "../util/gather-extended-templates";
import { getContext } from "../util/get-context";
import {
  CoatManifestFile,
  CoatManifestFileType,
} from "../types/coat-manifest-file";
import * as mergeFilesImport from "./merge-files";
import * as mergeScriptsImport from "./merge-scripts";
import * as mergeDependenciesImport from "./merge-dependencies";
import * as setupImport from "../setup";
import * as updateLockfilesImport from "../lockfiles/update-lockfiles";
import { getStrictCoatManifest } from "../util/get-strict-coat-manifest";
import {
  COAT_GLOBAL_LOCKFILE_PATH,
  PACKAGE_JSON_FILENAME,
  COAT_LOCAL_LOCKFILE_VERSION,
  COAT_MANIFEST_FILENAME,
  COAT_LOCAL_LOCKFILE_PATH,
} from "../constants";
import { CoatManifest } from "../types/coat-manifest";
import { groupFiles } from "./group-files";
import { flatten } from "lodash";

jest.mock("fs").mock("execa").mock("../util/gather-extended-templates");

const platformRoot = path.parse(process.cwd()).root;
const testCwd = path.join(platformRoot, "test");

const templates: CoatManifest[] = [
  {
    name: "template-1",
    files: [],
    dependencies: {
      dependencies: {
        template1A: "1.0.0",
      },
    },
    scripts: [
      {
        id: "lint",
        scriptName: "lint",
        run: "test",
      },
    ],
  },
  {
    name: "template-2",
    files: [
      {
        file: "some-folder/deep-folder/template2x.json",
        content: { template2: true },
        type: CoatManifestFileType.Json as const,
      },
      {
        file: "local-file.json",
        content: { local2: true },
        type: CoatManifestFileType.Json as const,
      },
    ],
    dependencies: {},
    scripts: [
      {
        id: "build",
        scriptName: "build",
        run: "test",
      },
    ],
  },
].map((template) => getStrictCoatManifest(template));

const gatherExtendedTemplatesMock = (gatherExtendedTemplates as unknown) as jest.Mock;
gatherExtendedTemplatesMock.mockImplementation(() => templates);

const coatManifest: CoatManifest = {
  name: "test-manifest",
  extends: templates.map((_, index) => `./template-${index}.js`),
  files: [
    {
      file: "manifestA.json",
      type: CoatManifestFileType.Json,
      content: { a: true },
    },
  ],
  dependencies: {
    dependencies: {
      coatManifestA: "1.0.0",
    },
  },
  scripts: [],
};

const currentDependencies = {
  dependencies: {
    a: "1.0.0",
  },
  devDependencies: {
    b: "1.0.0",
  },
  optionalDependencies: {
    c: "1.0.0",
  },
  peerDependencies: {
    d: "1.0.0",
  },
};
const packageJson = {
  scripts: {
    "script-from-package.json": "test",
  },
  ...currentDependencies,
};

describe("sync", () => {
  let mergeScriptsSpy: jest.SpyInstance;
  let mergeDependenciesSpy: jest.SpyInstance;
  let mergeFilesSpy: jest.SpyInstance;
  let setupSpy: jest.SpyInstance;
  let updateLockfilesSpy: jest.SpyInstance;

  afterEach(() => {
    vol.reset();
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    mergeScriptsSpy = jest.spyOn(mergeScriptsImport, "mergeScripts");
    mergeDependenciesSpy = jest.spyOn(
      mergeDependenciesImport,
      "mergeDependencies"
    );
    mergeFilesSpy = jest.spyOn(mergeFilesImport, "mergeFiles");
    setupSpy = jest.spyOn(setupImport, "setup");
    updateLockfilesSpy = jest.spyOn(updateLockfilesImport, "updateLockfiles");

    // Place template files
    await Promise.all([
      fs.outputFile(
        path.join(testCwd, COAT_MANIFEST_FILENAME),
        JSON.stringify(coatManifest)
      ),
      fs.outputFile(
        path.join(testCwd, PACKAGE_JSON_FILENAME),
        JSON.stringify(packageJson)
      ),
    ]);
  });

  test("should be exported correctly", () => {
    expect(sync).toBeInstanceOf(Function);
  });

  test("should call mergeScripts with extended templates and current coat manifest", async () => {
    await sync(testCwd);
    expect(mergeScriptsSpy).toBeCalledTimes(1);

    const templateScripts = templates.map((template) => template.scripts);
    const coatManifestScripts = coatManifest.scripts;
    expect(mergeScriptsSpy).toHaveBeenLastCalledWith([
      ...templateScripts,
      // Scripts from coat manifest are applied last to override templates
      coatManifestScripts,
    ]);
  });

  test("should call mergeDependencies with current dependencies, extended templates and deps from the current coat manifest", async () => {
    await sync(testCwd);
    expect(mergeDependenciesSpy).toHaveBeenCalledTimes(1);

    const templateDeps = templates.map((template) => template.dependencies);
    const coatManifestDeps = coatManifest.dependencies;
    expect(mergeDependenciesSpy).toHaveBeenCalledWith([
      currentDependencies,
      ...templateDeps,
      coatManifestDeps,
    ]);
  });

  test("should add entry for package.json and current coatManifest files to the mergeFiles call", async () => {
    const testContext = await getContext(testCwd);
    await sync(testCwd);
    expect(mergeFilesSpy).toHaveBeenCalledTimes(1);

    const packageJsonFileEntry = {
      type: CoatManifestFileType.Json,
      file: "package.json",
      content: {
        ...packageJson,
        ...mergeDependenciesSpy.mock.results[0].value,
        scripts: {
          ...packageJson.scripts,
          ...mergeScriptsSpy.mock.results[0].value,
        },
      },
    };
    const templateFiles = templates.map((template) => template.files);
    const coatManifestFiles = coatManifest.files;
    testContext.packageJson = packageJsonFileEntry.content;
    expect(mergeFilesSpy).toHaveBeenLastCalledWith(
      groupFiles(
        flatten([
          packageJsonFileEntry,
          ...templateFiles,
          ...(coatManifestFiles as CoatManifestFile[]),
        ]) as CoatManifestFile[],
        testContext
      ),
      testContext
    );
  });

  test("should write all synced files to the file system", async () => {
    await sync(testCwd);
    const [
      fileEntries,
      coatManifestFileRaw,
      templateFileRaw,
      templateLocalFileRaw,
      packageJsonRaw,
    ] = await Promise.all([
      fs.readdir(testCwd),
      fs.readFile(path.join(testCwd, "manifestA.json"), "utf8"),
      fs.readFile(
        path.join(testCwd, "some-folder", "deep-folder", "template2x.json"),
        "utf8"
      ),
      fs.readFile(path.join(testCwd, "local-file.json"), "utf8"),
      fs.readFile(path.join(testCwd, "package.json"), "utf8"),
    ]);

    const expectedFiles = [
      "some-folder",
      COAT_MANIFEST_FILENAME,
      PACKAGE_JSON_FILENAME,
      "manifestA.json",
      COAT_GLOBAL_LOCKFILE_PATH,
      "local-file.json",
    ];
    fileEntries.sort();
    expectedFiles.sort();
    expect(fileEntries).toEqual(expectedFiles);

    const coatManifestFileParsed = JSON.parse(coatManifestFileRaw);
    const templateFileParsed = JSON.parse(templateFileRaw);
    const templateLocalFileParsed = JSON.parse(templateLocalFileRaw);
    const packageJsonParsed = JSON.parse(packageJsonRaw);

    expect(coatManifestFileParsed).toMatchInlineSnapshot(`
      Object {
        "a": true,
      }
    `);
    expect(templateFileParsed).toMatchInlineSnapshot(`
      Object {
        "template2": true,
      }
    `);
    expect(templateLocalFileParsed).toMatchInlineSnapshot(`
      Object {
        "local2": true,
      }
    `);
    expect(packageJsonParsed).toMatchInlineSnapshot(`
      Object {
        "dependencies": Object {
          "a": "1.0.0",
          "coatManifestA": "1.0.0",
          "template1A": "1.0.0",
        },
        "devDependencies": Object {
          "b": "1.0.0",
        },
        "optionalDependencies": Object {
          "c": "1.0.0",
        },
        "peerDependencies": Object {
          "d": "1.0.0",
        },
        "scripts": Object {
          "build": "test",
          "lint": "test",
          "script-from-package.json": "test",
        },
      }
    `);
  });

  test("should run npm install in project directory if dependencies are changed", async () => {
    await sync(testCwd);
    expect(execa).toHaveBeenCalledTimes(1);

    expect(execa).toHaveBeenCalledWith("npm", ["install"], {
      cwd: testCwd,
      stdio: "inherit",
    });
  });

  test("should not run npm install if dependencies are not changed", async () => {
    const testTemplates = templates.map((template) => ({
      ...template,
      dependencies: {},
    }));
    gatherExtendedTemplatesMock.mockImplementationOnce(() => testTemplates);
    gatherExtendedTemplatesMock.mockImplementationOnce(() => testTemplates);

    // Place coat manifest without dependencies entry
    await fs.outputFile(
      path.join(testCwd, COAT_MANIFEST_FILENAME),
      JSON.stringify({
        ...coatManifest,
        dependencies: {},
      })
    );
    await sync(testCwd);
    expect(execa).not.toHaveBeenCalled();
  });

  test("should not run npm install if package.json file is removed", async () => {
    const testTemplates = [
      ...templates,
      getStrictCoatManifest({
        name: "remove-pjson",
        files: [
          {
            file: PACKAGE_JSON_FILENAME,
            type: CoatManifestFileType.Json,
            content: null,
          },
        ],
      }),
    ];
    gatherExtendedTemplatesMock.mockImplementationOnce(() => testTemplates);
    gatherExtendedTemplatesMock.mockImplementationOnce(() => testTemplates);

    await sync(testCwd);
    try {
      await fs.stat(path.join(testCwd, PACKAGE_JSON_FILENAME));
      throw new Error(
        `${PACKAGE_JSON_FILENAME} should not exist in test directory`
      );
    } catch (error) {
      // Ignore error
    }
    expect(execa).not.toHaveBeenCalled();
  });

  test("should delete global files that are no longer managed", async () => {
    const unmanagedFilePath = "unmanaged-path-1.json";
    await Promise.all([
      // Put unmanaged file into global lockfile
      fs.outputFile(
        path.join(testCwd, COAT_GLOBAL_LOCKFILE_PATH),
        yaml.safeDump({
          version: 1,
          files: [
            {
              path: unmanagedFilePath,
            },
          ],
        })
      ),
      // Place file to delete on test file system
      fs.outputFile(path.join(testCwd, unmanagedFilePath), ""),
    ]);

    const folderContentBeforeSync = await fs.readdir(testCwd);
    expect(folderContentBeforeSync).toContain(unmanagedFilePath);

    await sync(testCwd);

    const folderContentAfterSync = await fs.readdir(testCwd);
    expect(folderContentAfterSync).not.toContain(unmanagedFilePath);
  });

  test("should delete local files that are no longer managed", async () => {
    const unmanagedFilePath = "unmanaged-path-1.json";
    await Promise.all([
      // Add unmanaged file to local lockfile
      fs.outputFile(
        path.join(testCwd, COAT_LOCAL_LOCKFILE_PATH),
        yaml.safeDump({
          version: COAT_LOCAL_LOCKFILE_VERSION,
          files: [
            {
              path: unmanagedFilePath,
            },
          ],
        })
      ),
      // Place file to delete on test file system
      fs.outputFile(path.join(testCwd, unmanagedFilePath), ""),
    ]);

    const folderContentBeforeSync = await fs.readdir(testCwd);
    expect(folderContentBeforeSync).toContain(unmanagedFilePath);

    await sync(testCwd);

    const folderContentAfterSync = await fs.readdir(testCwd);
    expect(folderContentAfterSync).not.toContain(unmanagedFilePath);
  });

  test("should not throw any errors if files that are no longer managed have already been deleted", async () => {
    const unmanagedFilePath = "unmanaged-path-1.json";

    // Put unmanaged file into global lockfile
    await fs.outputFile(
      path.join(testCwd, COAT_GLOBAL_LOCKFILE_PATH),
      yaml.safeDump({
        version: 1,
        files: [
          {
            path: unmanagedFilePath,
          },
        ],
      })
    );
    await sync(testCwd);

    const folderContentAfterSync = await fs.readdir(testCwd);
    expect(folderContentAfterSync).not.toContain(unmanagedFilePath);
  });

  test("should place files that have once = true only once", async () => {
    const newTemplates = [
      ...templates,
      {
        name: "once-template",
        files: [
          {
            file: "once-a.json",
            content: { a: true },
            type: CoatManifestFileType.Json as const,
            once: true,
          },
          {
            file: "once-b.json",
            content: { b: true },
            type: CoatManifestFileType.Json as const,
            once: true,
            local: true,
          },
        ],
      },
    ].map((template) => getStrictCoatManifest(template));
    gatherExtendedTemplatesMock.mockImplementationOnce(() => newTemplates);
    gatherExtendedTemplatesMock.mockImplementationOnce(() => newTemplates);

    await sync(testCwd);

    const [onceARaw, onceBRaw] = await Promise.all([
      fs.readFile(path.join(testCwd, "once-a.json"), "utf-8"),
      fs.readFile(path.join(testCwd, "once-b.json"), "utf-8"),
    ]);
    expect(JSON.parse(onceARaw)).toEqual({
      a: true,
    });
    expect(JSON.parse(onceBRaw)).toEqual({
      b: true,
    });

    // Modify once files
    await Promise.all([
      fs.unlink(path.join(testCwd, "once-a.json")),
      fs.writeFile(
        path.join(testCwd, "once-b.json"),
        JSON.stringify({ newB: true })
      ),
    ]);

    gatherExtendedTemplatesMock.mockImplementationOnce(() => newTemplates);
    gatherExtendedTemplatesMock.mockImplementationOnce(() => newTemplates);

    await sync(testCwd);

    await expect(
      fs.readFile(path.join(testCwd, "once-a.json"), "utf-8")
    ).rejects.toHaveProperty(
      "message",
      expect.stringMatching(
        /ENOENT: no such file or directory, open '.*once-a.json/
      )
    );

    const onceBRaw2 = await fs.readFile(
      path.join(testCwd, "once-b.json"),
      "utf-8"
    );

    expect(JSON.parse(onceBRaw2)).toEqual({
      newB: true,
    });
  });

  test("should call setup with force = false", async () => {
    await sync(testCwd);

    expect(setupSpy).toHaveBeenCalledTimes(1);
    expect(setupSpy).toHaveBeenLastCalledWith(testCwd, false);
  });

  test("should still write files to disk if lockfile updates fail", async () => {
    updateLockfilesSpy.mockImplementationOnce(async () => {
      throw new Error("Expected error");
    });

    await expect(() => sync(testCwd)).rejects.toHaveProperty(
      "message",
      "Expected error"
    );

    const fileEntries = await fs.readdir(testCwd);

    const expectedFiles = [
      "some-folder",
      COAT_MANIFEST_FILENAME,
      PACKAGE_JSON_FILENAME,
      "manifestA.json",
      "local-file.json",
    ];
    fileEntries.sort();
    expectedFiles.sort();
    expect(fileEntries).toEqual(expectedFiles);
  });
});
