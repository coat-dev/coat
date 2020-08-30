import fs from "fs-extra";
import path from "path";
import execa from "execa";
import flatten from "lodash/flatten";
import { vol } from "memfs";
import { sync } from ".";
import { gatherExtendedTemplates } from "./gather-extended-templates";
import { getContext } from "../util/get-context";
import { polishFiles } from "./polish-files";
import {
  CoatManifestMergedFile,
  CoatManifestFile,
} from "../types/coat-manifest-file";
import { mergeFiles } from "./merge-files";
import { mergeScripts } from "./merge-scripts";
import { mergeDependencies } from "./merge-dependencies";
import { getNormalizedFilePath } from "../util/get-normalized-file-path";
import { getStrictCoatManifest } from "../util/get-strict-coat-manifest";
import { COAT_LOCKFILE_FILENAME, PACKAGE_JSON_FILENAME } from "../constants";

jest
  .mock("fs")
  .mock("execa")
  .mock("../util/get-context")
  .mock("./gather-extended-templates")
  .mock("./merge-files")
  .mock("./merge-scripts")
  .mock("./merge-dependencies")
  .mock("./polish-files");

const platformRoot = path.parse(process.cwd()).root;
const testCwd = path.join(platformRoot, "test");

const templates = [
  {
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
    files: [
      {
        file: "some-folder/deep-folder/template2x.json",
        content: { template2: true },
        type: "JSON",
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
];

const coatManifest = {
  files: [
    {
      file: "manifestA.json",
      type: "JSON",
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

const getContextMock = getContext as jest.Mock;
getContextMock.mockImplementation(() => ({
  cwd: testCwd,
  coatManifest,
  packageJson,
}));

const gatherExtendedTemplatesMock = gatherExtendedTemplates as jest.Mock;
gatherExtendedTemplatesMock.mockImplementation(() => templates);

const mergeScriptsMock = mergeScripts as jest.Mock;
mergeScriptsMock.mockImplementation(() => ({
  lint: "test",
  build: "test",
}));

const mergeDependenciesMock = mergeDependencies as jest.Mock;
mergeDependenciesMock.mockImplementation(() => ({
  dependencies: {
    mergedA: "1.0.0",
  },
  devDependencies: {
    mergedB: "1.0.0",
  },
  optionalDependencies: {
    mergedC: "1.0.0",
  },
  peerDependencies: {
    mergedD: "1.0.0",
  },
}));

const mergeFilesMock = mergeFiles as jest.Mock;
function mergeFilesMockImplementation(
  input: CoatManifestFile[][]
): CoatManifestFile[] {
  return flatten<CoatManifestFile>(input).map((file) => ({
    ...file,
    // Prepend testCwd to mocked mergeFiles function, since
    // mergeFiles returns normalized paths
    file: getNormalizedFilePath(file.file, {
      cwd: testCwd,
      coatManifest: getStrictCoatManifest({ name: "test-project" }),
      packageJson: {},
      coatLockfile: undefined,
    }),
  }));
}
mergeFilesMock.mockImplementation(mergeFilesMockImplementation);

const polishFilesMock = polishFiles as jest.Mock;
polishFilesMock.mockImplementation((input) =>
  input.map((file: CoatManifestMergedFile) => ({
    file: file.file,
    content: JSON.stringify(file.content),
  }))
);

describe("sync", () => {
  afterEach(() => {
    vol.reset();
    jest.clearAllMocks();
  });

  test("should be exported correctly", () => {
    expect(sync).toBeInstanceOf(Function);
  });

  test("should call mergeScripts with extended templates and current coat manifest", async () => {
    await sync(testCwd);
    expect(mergeScriptsMock).toBeCalledTimes(1);

    const templateScripts = templates.map((template) => template.scripts);
    const coatManifestScripts = coatManifest.scripts;
    expect(mergeScriptsMock).toHaveBeenCalledWith([
      ...templateScripts,
      // Scripts from coat manifest are applied last to override templates
      coatManifestScripts,
    ]);
  });

  test("should call mergeDependencies with current dependencies, extended templates and deps from the current coat manifest", async () => {
    await sync(testCwd);
    expect(mergeDependencies).toHaveBeenCalledTimes(1);

    const templateDeps = templates.map((template) => template.dependencies);
    const coatManifestDeps = coatManifest.dependencies;
    expect(mergeDependencies).toHaveBeenCalledWith([
      currentDependencies,
      ...templateDeps,
      coatManifestDeps,
    ]);
  });

  test("should add entry for package.json and current coatManifest files to the mergeFiles call", async () => {
    await sync(testCwd);
    expect(mergeFiles).toHaveBeenCalledTimes(1);

    const packageJsonFileEntry = {
      type: "JSON",
      file: "package.json",
      content: {
        ...packageJson,
        ...mergeDependenciesMock.mock.results[0].value,
        scripts: {
          ...packageJson.scripts,
          ...mergeScriptsMock.mock.results[0].value,
        },
      },
    };
    const templateFiles = templates.map((template) => template.files);
    const coatManifestFiles = coatManifest.files;
    expect(mergeFiles).toHaveBeenCalledWith(
      [[packageJsonFileEntry], ...templateFiles, coatManifestFiles],
      await getContext(testCwd)
    );
  });

  test("should write all synced files to the file system", async () => {
    await sync(testCwd);
    const [
      fileEntries,
      coatManifestFileRaw,
      templateFileRaw,
      packageJsonRaw,
    ] = await Promise.all([
      fs.readdir(testCwd),
      fs.readFile(path.join(testCwd, "manifestA.json"), "utf8"),
      fs.readFile(
        path.join(testCwd, "some-folder", "deep-folder", "template2x.json"),
        "utf8"
      ),
      fs.readFile(path.join(testCwd, "package.json"), "utf8"),
    ]);

    const expectedFiles = [
      "some-folder",
      PACKAGE_JSON_FILENAME,
      "manifestA.json",
      COAT_LOCKFILE_FILENAME,
    ];
    fileEntries.sort();
    expectedFiles.sort();
    expect(fileEntries).toEqual(expectedFiles);

    const coatManifestFileParsed = JSON.parse(coatManifestFileRaw);
    const templateFileParsed = JSON.parse(templateFileRaw);
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
    expect(packageJsonParsed).toMatchInlineSnapshot(`
      Object {
        "dependencies": Object {
          "mergedA": "1.0.0",
        },
        "devDependencies": Object {
          "mergedB": "1.0.0",
        },
        "optionalDependencies": Object {
          "mergedC": "1.0.0",
        },
        "peerDependencies": Object {
          "mergedD": "1.0.0",
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
    mergeDependenciesMock.mockImplementationOnce(() => currentDependencies);
    await sync(testCwd);
    expect(execa).not.toHaveBeenCalled();
  });

  test("should not run npm install if package.json file is removed", async () => {
    mergeFilesMock.mockImplementationOnce((input: CoatManifestFile[][]) => {
      const filterdInput = input.map((templateFiles) =>
        templateFiles.filter(
          (file: CoatManifestFile) => file.file !== PACKAGE_JSON_FILENAME
        )
      );
      return mergeFilesMockImplementation(filterdInput);
    });
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

  test("should delete files that are no longer managed", async () => {
    const unmanagedFilePath = "unmanaged-path-1.json";
    getContextMock.mockImplementationOnce(() => ({
      cwd: testCwd,
      coatManifest,
      packageJson,
      coatLockfile: {
        version: 1,
        files: [
          {
            path: unmanagedFilePath,
          },
        ],
      },
    }));
    // Place file to delete on test file system
    await fs.outputFile(path.join(testCwd, unmanagedFilePath), "");

    const folderContentBeforeSync = await fs.readdir(testCwd);
    expect(folderContentBeforeSync).toContain(unmanagedFilePath);

    await sync(testCwd);

    const folderContentAfterSync = await fs.readdir(testCwd);
    expect(folderContentAfterSync).not.toContain(unmanagedFilePath);
  });

  test("should not throw any errors if files that are no longer managed have already been deleted", async () => {
    const unmanagedFilePath = "unmanaged-path-1.json";
    getContextMock.mockImplementationOnce(() => ({
      cwd: testCwd,
      coatManifest,
      packageJson,
      coatLockfile: {
        version: 1,
        files: [
          {
            path: unmanagedFilePath,
          },
        ],
      },
    }));
    await sync(testCwd);

    const folderContentAfterSync = await fs.readdir(testCwd);
    expect(folderContentAfterSync).not.toContain(unmanagedFilePath);
  });
});
