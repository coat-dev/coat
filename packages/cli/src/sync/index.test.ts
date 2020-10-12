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
import { getStrictCoatManifest } from "../util/get-strict-coat-manifest";
import {
  COAT_GLOBAL_LOCKFILE_PATH,
  PACKAGE_JSON_FILENAME,
  COAT_LOCAL_LOCKFILE_VERSION,
  COAT_MANIFEST_FILENAME,
  COAT_LOCAL_LOCKFILE_PATH,
} from "../constants";
import { CoatManifestStrict } from "../types/coat-manifest";
import * as groupFilesImport from "./group-files";
import { flatten } from "lodash";
import { getDefaultFiles } from "./get-default-files";
import {
  FileOperation,
  FileOperationType,
  getFileOperations,
} from "./get-file-operations";
import { getFileHash } from "../util/get-file-hash";
import { promptForFileOperations } from "./prompt-for-file-operations";
import { performFileOperations } from "./perform-file-operations";
import { getStrictCoatLocalLockfile } from "../lockfiles/get-strict-coat-lockfiles";
import stripAnsi from "strip-ansi";

jest
  .mock("fs")
  .mock("execa")
  .mock("ora")
  .mock("../util/gather-extended-templates")
  .mock("./get-file-operations")
  .mock("./prompt-for-file-operations")
  .mock("./perform-file-operations");

const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {
  // Empty function
});

const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {
  // Empty function
});

const exitSpy = jest.spyOn(process, "exit").mockImplementation((): never => {
  throw new Error("process.exit");
});

const platformRoot = path.parse(process.cwd()).root;
const testCwd = path.join(platformRoot, "test");

const templates: CoatManifestStrict[] = [
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
        local: true,
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

const getFileOperationsMock = (getFileOperations as unknown) as jest.Mock;
getFileOperationsMock.mockReturnValue([]);

const promptForFileOperationsMock = (promptForFileOperations as unknown) as jest.Mock;
promptForFileOperationsMock.mockResolvedValue(true);

const performFileOperationsMock = (performFileOperations as unknown) as jest.Mock;

const groupFilesSpy = jest.spyOn(groupFilesImport, "groupFiles");
const { groupFiles } = groupFilesImport;

const mergeScriptsSpy = jest.spyOn(mergeScriptsImport, "mergeScripts");
const mergeDependenciesSpy = jest.spyOn(
  mergeDependenciesImport,
  "mergeDependencies"
);
const mergeFilesSpy = jest.spyOn(mergeFilesImport, "mergeFiles");
const setupSpy = jest.spyOn(setupImport, "setup");

const coatManifest: CoatManifestStrict = getStrictCoatManifest({
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
});

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

const execaMock = (execa as unknown) as jest.Mock;

describe("sync", () => {
  afterEach(() => {
    vol.reset();
    jest.clearAllMocks();
  });

  beforeEach(async () => {
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
    await sync({ cwd: testCwd });
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
    await sync({ cwd: testCwd });
    expect(mergeDependenciesSpy).toHaveBeenCalledTimes(2);

    const templateDeps = templates.map((template) => template.dependencies);
    const coatManifestDeps = coatManifest.dependencies;

    expect(mergeDependenciesSpy.mock.calls[0]).toEqual([
      [...templateDeps, coatManifestDeps],
    ]);

    expect(mergeDependenciesSpy.mock.calls[1]).toEqual([
      [currentDependencies, mergeDependenciesSpy.mock.results[0].value],
    ]);
  });

  test("should add entry for package.json and current coatManifest files to the mergeFiles call", async () => {
    const testContext = await getContext(testCwd);
    await sync({ cwd: testCwd });
    expect(mergeFilesSpy).toHaveBeenCalledTimes(1);

    const packageJsonFileEntry = {
      type: CoatManifestFileType.Json,
      file: "package.json",
      content: {
        ...packageJson,
        ...mergeDependenciesSpy.mock.results[1].value,
        scripts: {
          ...packageJson.scripts,
          ...mergeScriptsSpy.mock.results[0].value.scripts,
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
          ...getDefaultFiles(),
          ...templateFiles,
          ...coatManifestFiles,
        ]) as CoatManifestFile[],
        testContext
      ),
      testContext
    );
  });

  test("should call getFileOperations with the correct files", async () => {
    await sync({ cwd: testCwd });

    expect(getFileOperationsMock).toHaveBeenCalledTimes(1);
    expect(getFileOperationsMock.mock.calls[0]).toEqual([
      // files to place
      [
        {
          file: path.join(testCwd, PACKAGE_JSON_FILENAME),
          content: expect.any(String),
          hash: expect.any(String),
          local: false,
          once: false,
          relativePath: PACKAGE_JSON_FILENAME,
          type: "JSON",
        },
        {
          file: path.join(testCwd, ".gitignore"),
          content: expect.any(String),
          local: false,
          once: true,
          relativePath: ".gitignore",
          type: "TEXT",
        },
        {
          file: path.join(
            testCwd,
            "some-folder",
            "deep-folder",
            "template2x.json"
          ),
          content: expect.any(String),
          hash: expect.any(String),
          local: false,
          once: false,
          relativePath: "some-folder/deep-folder/template2x.json",
          type: "JSON",
        },
        {
          file: path.join(testCwd, "local-file.json"),
          content: expect.any(String),
          hash: expect.any(String),
          local: true,
          once: false,
          relativePath: "local-file.json",
          type: "JSON",
        },
        {
          file: path.join(testCwd, "manifestA.json"),
          content: expect.any(String),
          hash: expect.any(String),
          local: false,
          once: false,
          relativePath: "manifestA.json",
          type: "JSON",
        },
      ],
      // files to remove
      [],
      // current files
      {
        [path.join(testCwd, ".gitignore")]: undefined,
        [path.join(testCwd, "local-file.json")]: undefined,
        [path.join(testCwd, "manifestA.json")]: undefined,
        [path.join(
          testCwd,
          "some-folder",
          "deep-folder",
          "template2x.json"
        )]: undefined,
        [path.join(testCwd, "package.json")]: expect.any(String),
      },
      // coat context
      {
        coatGlobalLockfile: {
          files: [],
          setup: {},
          scripts: [],
          dependencies: {
            dependencies: [],
            devDependencies: [],
            peerDependencies: [],
            optionalDependencies: [],
          },
          version: 1,
        },
        coatLocalLockfile: {
          files: [],
          setup: {},
          version: 1,
        },
        coatManifest: {
          dependencies: {
            dependencies: {
              coatManifestA: "1.0.0",
            },
            devDependencies: {},
            optionalDependencies: {},
            peerDependencies: {},
          },
          extends: ["./template-0.js", "./template-1.js"],
          files: [
            {
              content: { a: true },
              file: "manifestA.json",
              type: "JSON",
            },
          ],
          name: "test-manifest",
          scripts: [],
          setup: [],
        },
        cwd: testCwd,
        packageJson: {
          dependencies: {
            a: "1.0.0",
            coatManifestA: "1.0.0",
            template1A: "1.0.0",
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
          scripts: {
            build: "test",
            lint: "test",
            "script-from-package.json": "test",
          },
        },
      },
    ]);
  });

  test("should call promptForFileOperations with the correct file operations", async () => {
    // Testing with an empty array is sufficient, since the array is exactly the one that is
    // returned from getFileOperations
    const fileOperations: FileOperation[] = [];

    getFileOperationsMock.mockReturnValueOnce(fileOperations);

    await sync({ cwd: testCwd });

    expect(promptForFileOperationsMock).toHaveBeenCalledTimes(1);
    expect(promptForFileOperationsMock).toHaveBeenLastCalledWith(
      fileOperations
    );

    // Array should be exactly the return value from getFileOperations
    expect(promptForFileOperationsMock.mock.calls[0][0]).toBe(fileOperations);
  });

  test("should call performFileOperations with the correct file operations", async () => {
    // Testing with an empty array is sufficient, since the array is exactly the one that is
    // returned from getFileOperations
    const fileOperations: FileOperation[] = [];

    getFileOperationsMock.mockReturnValueOnce(fileOperations);

    await sync({ cwd: testCwd });

    expect(performFileOperationsMock).toHaveBeenCalledTimes(1);
    expect(performFileOperationsMock).toHaveBeenLastCalledWith(fileOperations);

    // Array should be exactly the return value from getFileOperations
    expect(performFileOperationsMock.mock.calls[0][0]).toBe(fileOperations);
  });

  test("should run npm install in project directory if dependencies are changed", async () => {
    await sync({ cwd: testCwd });
    expect(execa).toHaveBeenCalledTimes(1);

    expect(execa).toHaveBeenCalledWith("npm", ["install"], {
      cwd: testCwd,
    });
  });

  test("should throw error if npm install fails", async () => {
    execaMock.mockImplementationOnce(() => {
      throw new Error("Install error");
    });
    await expect(() => sync({ cwd: testCwd })).rejects.toMatchInlineSnapshot(
      `[Error: Install error]`
    );
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
    await sync({ cwd: testCwd });
    expect(execa).not.toHaveBeenCalled();
  });

  test("should not run npm install if there are no dependencies", async () => {
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

    // Update package.json to be without dependencies
    await fs.outputFile(path.join(testCwd, PACKAGE_JSON_FILENAME), "{}");

    await sync({ cwd: testCwd });
    expect(execa).not.toHaveBeenCalled();
  });

  test("should not run npm install if package.json file is removed", async () => {
    const testTemplates = [
      ...templates,
      getStrictCoatManifest({
        name: "remove-package-json",
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

    await sync({ cwd: testCwd });
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
        yaml.dump({
          version: 1,
          files: [
            {
              path: unmanagedFilePath,
              hash: getFileHash(""),
            },
          ],
        })
      ),
      // Place file to delete on test file system
      fs.outputFile(path.join(testCwd, unmanagedFilePath), ""),
    ]);

    await sync({ cwd: testCwd });

    expect(getFileOperationsMock).toHaveBeenCalledTimes(1);
    expect(getFileOperationsMock.mock.calls[0][1]).toEqual([
      {
        hash:
          "pp9zzKI6msXItWfcGFp1bpfJghZP4lhZ4NHcwUdcgKYVshI68fX5TBHj6UAsOsVY9QAZnZW20+MBdYWGKB3NJg==",
        once: false,
        path: "unmanaged-path-1.json",
        local: false,
      },
    ]);
  });

  test("should delete local files that are no longer managed", async () => {
    const unmanagedFilePath = "unmanaged-path-1.json";
    await Promise.all([
      // Add unmanaged file to local lockfile
      fs.outputFile(
        path.join(testCwd, COAT_LOCAL_LOCKFILE_PATH),
        yaml.dump({
          version: COAT_LOCAL_LOCKFILE_VERSION,
          files: [
            {
              path: unmanagedFilePath,
              hash: getFileHash(""),
            },
          ],
        })
      ),
      // Place file to delete on test file system
      fs.outputFile(path.join(testCwd, unmanagedFilePath), ""),
    ]);

    await sync({ cwd: testCwd });

    expect(getFileOperationsMock).toHaveBeenCalledTimes(1);
    expect(getFileOperationsMock.mock.calls[0][1]).toEqual([
      {
        hash:
          "pp9zzKI6msXItWfcGFp1bpfJghZP4lhZ4NHcwUdcgKYVshI68fX5TBHj6UAsOsVY9QAZnZW20+MBdYWGKB3NJg==",
        once: false,
        path: "unmanaged-path-1.json",
        local: true,
      },
    ]);
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

    await sync({ cwd: testCwd });

    expect(getFileOperationsMock).toHaveBeenCalledTimes(1);
    expect(getFileOperationsMock.mock.calls[0][0]).toContainEqual(
      expect.objectContaining({
        relativePath: "once-a.json",
      })
    );
    expect(getFileOperationsMock.mock.calls[0][0]).toContainEqual(
      expect.objectContaining({
        relativePath: "once-b.json",
      })
    );

    gatherExtendedTemplatesMock.mockImplementationOnce(() => newTemplates);
    gatherExtendedTemplatesMock.mockImplementationOnce(() => newTemplates);

    await sync({ cwd: testCwd });

    expect(getFileOperationsMock).toHaveBeenCalledTimes(2);

    expect(getFileOperationsMock.mock.calls[1][0]).not.toContainEqual(
      expect.objectContaining({
        relativePath: "once-a.json",
      })
    );
    expect(getFileOperationsMock.mock.calls[1][0]).not.toContainEqual(
      expect.objectContaining({
        relativePath: "once-b.json",
      })
    );
  });

  test("should call setup with force = false", async () => {
    await sync({ cwd: testCwd });

    expect(setupSpy).toHaveBeenCalledTimes(1);
    expect(setupSpy).toHaveBeenLastCalledWith({
      cwd: testCwd,
      check: false,
      force: false,
    });
  });

  test("should work without a package.json file on disk", async () => {
    // Remove package.json file before testing
    await fs.unlink(path.join(testCwd, PACKAGE_JSON_FILENAME));

    await sync({ cwd: testCwd });

    // group files will still be called with the new package.json file,
    // since the coat properties add properties to package.json
    expect(groupFilesSpy).toHaveBeenLastCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          file: PACKAGE_JSON_FILENAME,
        }),
      ]),
      expect.objectContaining({
        packageJson: expect.objectContaining({}),
      })
    );

    await expect(
      fs.readFile(path.join(testCwd, PACKAGE_JSON_FILENAME))
    ).rejects.toHaveProperty(
      "message",
      expect.stringMatching(
        /ENOENT: no such file or directory, open '.*package.json'/
      )
    );
  });

  test("should work without any package.json content", async () => {
    // Remove package.json file before testing
    await fs.unlink(path.join(testCwd, PACKAGE_JSON_FILENAME));
    // Place empty coat manifest
    await fs.writeFile(
      path.join(testCwd, COAT_MANIFEST_FILENAME),
      JSON.stringify({ name: "my-project" })
    );

    // Don't supply any templates when gatherAllTemplates is called
    gatherExtendedTemplatesMock.mockImplementationOnce(() => []);
    gatherExtendedTemplatesMock.mockImplementationOnce(() => []);

    await sync({ cwd: testCwd });

    // group files will still be called with the new package.json file,
    // since the coat properties add properties to package.json
    expect(groupFilesSpy).not.toHaveBeenLastCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          file: PACKAGE_JSON_FILENAME,
        }),
      ]),
      expect.objectContaining({
        packageJson: expect.objectContaining({}),
      })
    );

    await expect(
      fs.readFile(path.join(testCwd, PACKAGE_JSON_FILENAME))
    ).rejects.toHaveProperty(
      "message",
      expect.stringMatching(
        /ENOENT: no such file or directory, open '.*package.json'/
      )
    );
  });

  test("should remove existing scripts that start with a merged script prefix", async () => {
    // Write an existing script into package.json
    await Promise.all([
      fs.outputFile(
        path.join(testCwd, PACKAGE_JSON_FILENAME),
        JSON.stringify({
          ...packageJson,
          scripts: {
            "test:hi": "test",
          },
        })
      ),
      // add a parallel script to the coat manifest file
      fs.outputFile(
        path.join(testCwd, COAT_MANIFEST_FILENAME),
        JSON.stringify({
          ...coatManifest,
          scripts: [
            {
              id: "test-1",
              scriptName: "test",
              run: "echo Test 1",
            },
            {
              id: "test-2",
              scriptName: "test",
              run: "echo Test 2",
            },
          ],
        })
      ),
    ]);

    await sync({ cwd: testCwd });

    expect(mergeFilesSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        [path.join(testCwd, PACKAGE_JSON_FILENAME)]: expect.objectContaining({
          content: [
            expect.objectContaining({
              scripts: {
                build: "test",
                lint: "test",
                test: "coat run test:*",
                "test:1": "echo Test 1",
                "test:2": "echo Test 2",
              },
            }),
          ],
        }),
      }),
      expect.anything()
    );
  });

  test("should exit program if user aborts the prompt", async () => {
    // Set return value from should continue prompt to false
    promptForFileOperationsMock.mockResolvedValueOnce(false);

    await expect(() => sync({ cwd: testCwd })).rejects.toHaveProperty(
      "message",
      "process.exit"
    );

    expect(promptForFileOperationsMock).toHaveBeenCalledTimes(1);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenLastCalledWith(
      "Aborting coat sync due to user request."
    );

    expect(exitSpy).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenLastCalledWith(1);
  });

  describe("--check flag", () => {
    test("should exit successfully if coat project is up to date", async () => {
      gatherExtendedTemplatesMock.mockReturnValueOnce([]);
      gatherExtendedTemplatesMock.mockReturnValueOnce([]);
      // Place empty coat manifest
      await fs.outputFile(
        path.join(testCwd, COAT_MANIFEST_FILENAME),
        JSON.stringify({
          name: "my-project",
          files: [
            {
              file: ".gitignore",
              type: "TEXT",
              content: null,
            },
          ],
        })
      );

      await sync({ cwd: testCwd, check: true });

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(stripAnsi(consoleLogSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
        "
        ♻️ Everything up to date
        "
      `);
    });

    test("should call setup with check = true if check flag is set", async () => {
      gatherExtendedTemplatesMock.mockReturnValueOnce([]);
      gatherExtendedTemplatesMock.mockReturnValueOnce([]);
      // Place empty coat manifest
      await fs.outputFile(
        path.join(testCwd, COAT_MANIFEST_FILENAME),
        JSON.stringify({
          name: "my-project",
          files: [
            {
              file: ".gitignore",
              type: "TEXT",
              content: null,
            },
          ],
        })
      );

      await sync({ cwd: testCwd, check: true });

      expect(setupSpy).toHaveBeenCalledTimes(1);
      expect(setupSpy).toHaveBeenLastCalledWith({
        cwd: testCwd,
        force: false,
        check: true,
      });
    });

    test("should exit successfully even if there are local file operations pending", async () => {
      gatherExtendedTemplatesMock.mockReturnValueOnce([]);
      gatherExtendedTemplatesMock.mockReturnValueOnce([]);
      // Place empty coat manifest
      await fs.outputFile(
        path.join(testCwd, COAT_MANIFEST_FILENAME),
        JSON.stringify({
          name: "my-project",
          files: [
            {
              file: ".gitignore",
              type: "TEXT",
              content: null,
            },
          ],
        })
      );
      const fileOperations: FileOperation[] = [
        {
          absolutePath: path.join(testCwd, "file-a.json"),
          content: "{}",
          relativePath: "file-a.json",
          local: true,
          type: FileOperationType.Place,
        },
      ];
      getFileOperationsMock.mockReturnValueOnce(fileOperations);

      await sync({ cwd: testCwd, check: true });

      expect(performFileOperationsMock).not.toHaveBeenCalled();

      await expect(
        fs.readFile(path.join(testCwd, "file-a.json"))
      ).rejects.toHaveProperty(
        "message",
        expect.stringContaining("ENOENT: no such file or directory")
      );
    });

    test("should exit successfully even if there are local lockfile updates pending", async () => {
      gatherExtendedTemplatesMock.mockReturnValueOnce([]);
      gatherExtendedTemplatesMock.mockReturnValueOnce([]);
      // Place empty coat manifest
      await Promise.all([
        fs.outputFile(
          path.join(testCwd, COAT_MANIFEST_FILENAME),
          JSON.stringify({
            name: "my-project",
            files: [
              {
                file: ".gitignore",
                type: "TEXT",
                content: null,
              },
            ],
          })
        ),
        fs.outputFile(
          path.join(testCwd, COAT_LOCAL_LOCKFILE_PATH),
          JSON.stringify(
            getStrictCoatLocalLockfile({
              version: COAT_LOCAL_LOCKFILE_VERSION,
              files: [
                {
                  path: "file-a.json",
                  hash: "",
                },
              ],
            })
          )
        ),
      ]);

      await sync({ cwd: testCwd, check: true });

      // Local lockfile should not be modified
      const localLockfileOnDisk = await fs.readFile(
        path.join(testCwd, COAT_LOCAL_LOCKFILE_PATH),
        "utf-8"
      );
      const localLockfile = yaml.load(localLockfileOnDisk);
      expect(localLockfile).toEqual({
        version: COAT_LOCAL_LOCKFILE_VERSION,
        setup: {},
        files: [
          {
            path: "file-a.json",
            hash: "",
            once: false,
          },
        ],
      });
    });

    test("should exit with error and log pending global file operations", async () => {
      const fileOperations: FileOperation[] = [
        {
          absolutePath: path.join(testCwd, "file-a.json"),
          content: "{}",
          relativePath: "file-a.json",
          local: false,
          type: FileOperationType.Place,
        },
        {
          absolutePath: path.join(testCwd, "file-b.json"),
          relativePath: "file-b.json",
          local: false,
          type: FileOperationType.Delete,
        },
        {
          absolutePath: path.join(testCwd, "file-c.json"),
          content: "{}",
          relativePath: "file-c.json",
          local: false,
          type: FileOperationType.Update,
        },
      ];
      getFileOperationsMock.mockReturnValueOnce(fileOperations);

      await expect(sync({ cwd: testCwd, check: true })).rejects.toHaveProperty(
        "message",
        "process.exit"
      );

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(stripAnsi(consoleErrorSpy.mock.calls[0][0]))
        .toMatchInlineSnapshot(`
        "
        The coat project is not in sync.
        There are pending file updates:

          CREATE  file-a.json
          DELETE  file-b.json
          UPDATE  file-c.json

        Run coat sync to bring the project back in sync."
      `);
    });

    test("should exit with error if global lockfile has pending updates", async () => {
      await expect(sync({ cwd: testCwd, check: true })).rejects.toHaveProperty(
        "message",
        "process.exit"
      );

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(stripAnsi(consoleErrorSpy.mock.calls[0][0]))
        .toMatchInlineSnapshot(`
        "
        The coat project is not in sync.
        The global lockfile (coat.lock) needs to be updated.

        Run coat sync to bring the project back in sync."
      `);
    });
  });
});
