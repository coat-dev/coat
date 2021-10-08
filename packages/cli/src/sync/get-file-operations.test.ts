import produce from "immer";
import path from "path";
import {
  COAT_GLOBAL_LOCKFILE_VERSION,
  COAT_LOCAL_LOCKFILE_VERSION,
  PACKAGE_JSON_FILENAME,
} from "../constants";
import {
  getStrictCoatGlobalLockfile,
  getStrictCoatLocalLockfile,
} from "../lockfiles/get-strict-coat-lockfiles";
import { CoatContext } from "../types/coat-context";
import { CoatManifestFileType } from "../types/coat-manifest-file";
import { getFileHash } from "../util/get-file-hash";
import { getNormalizedFilePath } from "../util/get-normalized-file-path";
import { getStrictCoatManifest } from "../util/get-strict-coat-manifest";
import {
  FileOperationType,
  getFileOperations,
  UpdatePrompt,
} from "./get-file-operations";
import { PolishedFile } from "./polish-files";

describe("sync/get-file-operations", () => {
  const platformRoot = path.parse(process.cwd()).root;
  const testCwd = path.join(platformRoot, "test");
  const testContext: CoatContext = {
    cwd: testCwd,
    coatManifest: getStrictCoatManifest({
      name: "test",
    }),
    packageJson: {},
    coatGlobalLockfile: getStrictCoatGlobalLockfile({
      version: COAT_GLOBAL_LOCKFILE_VERSION,
    }),
    coatLocalLockfile: getStrictCoatLocalLockfile({
      version: COAT_LOCAL_LOCKFILE_VERSION,
    }),
  };

  test("should work with empty place and remove file arrays", () => {
    const fileOperations = getFileOperations([], [], {}, testContext);
    expect(fileOperations).toEqual([]);
  });

  test("should place all files without prompting if files don't exist yet", () => {
    const filesToPlace: PolishedFile[] = [
      {
        file: path.join(testCwd, "folder-1", "a.json"),
        type: CoatManifestFileType.Json,
        relativePath: "folder-1/a.json",
        content: JSON.stringify({ a: "new" }),
        hash: getFileHash(JSON.stringify({ a: "new" })),
        local: false,
        once: false,
      },
      {
        file: path.join(testCwd, "folder-1", "b.json"),
        type: CoatManifestFileType.Json,
        relativePath: "folder-1/b.json",
        content: JSON.stringify({ b: "new" }),
        hash: getFileHash(JSON.stringify({ b: "new" })),
        local: true,
        once: false,
      },
      {
        file: path.join(testCwd, "c.txt"),
        type: CoatManifestFileType.Text,
        relativePath: "c.txt",
        content: "Test Text",
        local: false,
        once: true,
      },
    ];

    const fileOperations = getFileOperations(filesToPlace, [], {}, testContext);

    expect(fileOperations).toHaveLength(3);

    filesToPlace.forEach((file) => {
      expect(fileOperations).toContainEqual({
        absolutePath: file.file,
        relativePath: file.relativePath,
        content: file.content,
        local: file.local,
        type: FileOperationType.Place,
      });
    });
  });

  test("should update files without prompting if files have not changed from lockfile entry", () => {
    // Put old files in lockfiles and current files
    const currentFiles = {
      [getNormalizedFilePath("folder-1/a.json", testContext)]: JSON.stringify({
        a: true,
      }),
      [getNormalizedFilePath("folder-1/b.json", testContext)]: JSON.stringify({
        b: true,
      }),
    };
    const context: CoatContext = produce(
      testContext,
      (newContext: CoatContext) => {
        newContext.coatGlobalLockfile.files.push({
          path: "folder-1/a.json",
          hash: getFileHash(JSON.stringify({ a: true })),
          once: false,
        });
        newContext.coatLocalLockfile.files.push({
          path: "folder-1/b.json",
          hash: getFileHash(JSON.stringify({ b: true })),
          once: false,
        });
      }
    );

    const filesToPlace: PolishedFile[] = [
      {
        file: path.join(testCwd, "folder-1", "a.json"),
        type: CoatManifestFileType.Json,
        relativePath: "folder-1/a.json",
        content: JSON.stringify({ a: "new" }),
        hash: getFileHash(JSON.stringify({ a: "new" })),
        local: false,
        once: false,
      },
      {
        file: path.join(testCwd, "folder-1", "b.json"),
        type: CoatManifestFileType.Json,
        relativePath: "folder-1/b.json",
        content: JSON.stringify({ b: "new" }),
        hash: getFileHash(JSON.stringify({ b: "new" })),
        local: true,
        once: false,
      },
    ];

    const fileOperations = getFileOperations(
      filesToPlace,
      [],
      currentFiles,
      context
    );

    expect(fileOperations).toHaveLength(2);
    filesToPlace.forEach((file) => {
      expect(fileOperations).toContainEqual({
        absolutePath: file.file,
        relativePath: file.relativePath,
        content: file.content,
        local: file.local,
        type: FileOperationType.Update,
      });
    });
  });

  test("should not update files if all files are up-to-date on the disk", () => {
    // Put old files in lockfiles and currentFiles
    const currentFiles = {
      [getNormalizedFilePath("folder-1/a.json", testContext)]: JSON.stringify({
        a: true,
      }),
      [getNormalizedFilePath("folder-1/b.json", testContext)]: JSON.stringify({
        b: true,
      }),
    };
    const context: CoatContext = produce(
      testContext,
      (newContext: CoatContext) => {
        newContext.coatGlobalLockfile.files.push({
          path: "folder-1/a.json",
          hash: getFileHash(JSON.stringify({ a: true })),
          once: false,
        });
        newContext.coatLocalLockfile.files.push({
          path: "folder-1/b.json",
          hash: getFileHash(JSON.stringify({ b: true })),
          once: false,
        });
      }
    );

    const filesToPlace: PolishedFile[] = [
      {
        file: path.join(testCwd, "folder-1", "a.json"),
        type: CoatManifestFileType.Json,
        relativePath: "folder-1/a.json",
        content: JSON.stringify({ a: true }),
        hash: getFileHash(JSON.stringify({ a: true })),
        local: false,
        once: false,
      },
      {
        file: path.join(testCwd, "folder-1", "b.json"),
        type: CoatManifestFileType.Json,
        relativePath: "folder-1/b.json",
        content: JSON.stringify({ b: true }),
        hash: getFileHash(JSON.stringify({ b: true })),
        local: true,
        once: false,
      },
    ];

    const fileOperations = getFileOperations(
      filesToPlace,
      [],
      currentFiles,
      context
    );

    expect(fileOperations).toHaveLength(0);
  });

  test("should not return operation if a once file would be placed but it already exists with the same content", () => {
    // Put once files in currentFiles
    const currentFiles = {
      [getNormalizedFilePath("folder-1/a.json", testContext)]: JSON.stringify({
        a: true,
      }),
      [getNormalizedFilePath("folder-1/b.json", testContext)]: JSON.stringify({
        b: true,
      }),
    };

    const filesToPlace: PolishedFile[] = [
      {
        file: path.join(testCwd, "folder-1", "a.json"),
        type: CoatManifestFileType.Json,
        relativePath: "folder-1/a.json",
        content: JSON.stringify({ a: true }),
        local: false,
        once: true,
      },
      {
        file: path.join(testCwd, "folder-1", "b.json"),
        type: CoatManifestFileType.Json,
        relativePath: "folder-1/b.json",
        content: JSON.stringify({ b: true }),
        local: true,
        once: true,
      },
    ];

    const fileOperations = getFileOperations(
      filesToPlace,
      [],
      currentFiles,
      testContext
    );

    expect(fileOperations).toHaveLength(0);
  });

  test("should not try to delete files that are no longer on the disk", () => {
    const context: CoatContext = produce(
      testContext,
      (newContext: CoatContext) => {
        newContext.coatGlobalLockfile.files.push({
          path: "folder-1/a.json",
          hash: getFileHash(JSON.stringify({ a: true })),
          once: false,
        });
        newContext.coatLocalLockfile.files.push({
          path: "folder-1/b.json",
          hash: getFileHash(JSON.stringify({ b: true })),
          once: false,
        });
      }
    );

    const filesToPlace: PolishedFile[] = [];
    const filesToRemove = [
      {
        path: "folder-1/a.json",
        once: false as const,
        local: false,
        hash: getFileHash(JSON.stringify({ a: true })),
      },
      {
        path: "folder-1/b.json",
        once: false as const,
        local: true,
        hash: getFileHash(JSON.stringify({ b: true })),
      },
    ];

    const currentFiles = {};
    const fileOperations = getFileOperations(
      filesToPlace,
      filesToRemove,
      currentFiles,
      context
    );

    expect(fileOperations).toHaveLength(0);
  });

  test("should delete files without prompting if content has not changed from lockfile entry", () => {
    // Put files in lockfiles and current files
    const currentFiles = {
      [getNormalizedFilePath("folder-1/a.json", testContext)]: JSON.stringify({
        a: true,
      }),
      [getNormalizedFilePath("folder-1/b.json", testContext)]: JSON.stringify({
        b: true,
      }),
    };

    const context: CoatContext = produce(
      testContext,
      (newContext: CoatContext) => {
        newContext.coatGlobalLockfile.files.push({
          path: "folder-1/a.json",
          hash: getFileHash(JSON.stringify({ a: true })),
          once: false,
        });
        newContext.coatLocalLockfile.files.push({
          path: "folder-1/b.json",
          hash: getFileHash(JSON.stringify({ b: true })),
          once: false,
        });
      }
    );

    const filesToPlace: PolishedFile[] = [];
    const filesToRemove = [
      {
        path: "folder-1/a.json",
        once: false as const,
        local: false,
        hash: getFileHash(JSON.stringify({ a: true })),
      },
      {
        path: "folder-1/b.json",
        once: false as const,
        local: true,
        hash: getFileHash(JSON.stringify({ b: true })),
      },
    ];

    const fileOperations = getFileOperations(
      filesToPlace,
      filesToRemove,
      currentFiles,
      context
    );

    expect(fileOperations).toHaveLength(2);
    filesToRemove.forEach((file) => {
      expect(fileOperations).toContainEqual({
        absolutePath: getNormalizedFilePath(file.path, testContext),
        relativePath: file.path,
        local: file.local,
        type: FileOperationType.Delete,
      });
    });
  });

  test("should not delete files that will be placed in the same run", () => {
    // Place file in currentFiles
    // that should be deleted / updated since it switches from "local" to "global"
    const currentFiles = {
      [getNormalizedFilePath("folder-1/a.json", testContext)]: JSON.stringify({
        a: "local",
      }),
    };
    const context: CoatContext = produce(
      testContext,
      (newContext: CoatContext) => {
        newContext.coatLocalLockfile.files.push({
          path: "folder-1/a.json",
          hash: getFileHash(JSON.stringify({ a: "local" })),
          once: false,
          local: true,
        });
      }
    );

    const filesToPlace: PolishedFile[] = [
      {
        file: path.join(testCwd, "folder-1", "a.json"),
        content: JSON.stringify({ a: "global" }),
        hash: JSON.stringify({ a: "global" }),
        type: CoatManifestFileType.Json,
        local: false,
        once: false,
        relativePath: "folder-1/a.json",
      },
    ];
    const filesToRemove = [
      {
        path: "folder-1/a.json",
        once: false as const,
        local: true,
        hash: getFileHash(JSON.stringify({ a: "local" })),
      },
    ];

    const fileOperations = getFileOperations(
      filesToPlace,
      filesToRemove,
      currentFiles,
      context
    );

    expect(fileOperations).toHaveLength(1);
    expect(fileOperations[0]).toEqual({
      absolutePath: filesToPlace[0].file,
      relativePath: filesToPlace[0].relativePath,
      content: filesToPlace[0].content,
      local: filesToPlace[0].local,
      type: FileOperationType.Update,
    });
  });

  test("should skip when deleting files and disk content has changed from lockfile entry", () => {
    // Put files in currentFiles and lockfiles
    const currentFiles = {
      [getNormalizedFilePath("folder-1/a.json", testContext)]: JSON.stringify({
        a: false,
      }),
      [getNormalizedFilePath("folder-1/b.json", testContext)]: JSON.stringify({
        b: false,
      }),
    };
    const context: CoatContext = produce(
      testContext,
      (newContext: CoatContext) => {
        newContext.coatGlobalLockfile.files.push({
          path: "folder-1/a.json",
          hash: getFileHash(JSON.stringify({ a: true })),
          once: false,
        });
        newContext.coatLocalLockfile.files.push({
          path: "folder-1/b.json",
          hash: getFileHash(JSON.stringify({ b: true })),
          once: false,
        });
      }
    );

    const filesToPlace: PolishedFile[] = [];
    const filesToRemove = [
      {
        path: "folder-1/a.json",
        once: false as const,
        local: false,
        hash: getFileHash(JSON.stringify({ a: true })),
      },
      {
        path: "folder-1/b.json",
        once: false as const,
        local: true,
        hash: getFileHash(JSON.stringify({ b: true })),
      },
    ];

    const fileOperations = getFileOperations(
      filesToPlace,
      filesToRemove,
      currentFiles,
      context
    );

    expect(fileOperations).toHaveLength(2);
    filesToRemove.forEach((file) => {
      expect(fileOperations).toContainEqual({
        absolutePath: getNormalizedFilePath(file.path, testContext),
        relativePath: file.path,
        local: file.local,
        type: FileOperationType.DeleteSkipped,
      });
    });
  });

  test("should not prompt if package.json is updated", () => {
    // Put modified package.json in currentFiles
    const currentFiles = {
      [getNormalizedFilePath(PACKAGE_JSON_FILENAME, testContext)]:
        JSON.stringify({ a: "modified" }),
    };

    const filesToPlace: PolishedFile[] = [
      {
        file: path.join(testCwd, PACKAGE_JSON_FILENAME),
        type: CoatManifestFileType.Json,
        relativePath: PACKAGE_JSON_FILENAME,
        content: JSON.stringify({ a: "updated" }),
        hash: getFileHash(JSON.stringify({ a: "updated" })),
        local: false,
        once: false,
      },
    ];

    const fileOperations = getFileOperations(
      filesToPlace,
      [],
      currentFiles,
      testContext
    );

    expect(fileOperations).toHaveLength(1);
    expect(fileOperations[0]).toEqual({
      absolutePath: filesToPlace[0].file,
      relativePath: filesToPlace[0].relativePath,
      local: filesToPlace[0].local,
      content: filesToPlace[0].content,
      type: FileOperationType.Update,
    });
  });

  test("should prompt when updating a continuous files for the first time and they already exists with different content", () => {
    // Put continuous files in currentFiles
    const currentFiles = {
      [getNormalizedFilePath("folder-1/a.json", testContext)]: JSON.stringify({
        a: false,
      }),
      [getNormalizedFilePath("folder-1/b.json", testContext)]: JSON.stringify({
        b: false,
      }),
    };

    const filesToPlace: PolishedFile[] = [
      {
        file: path.join(testCwd, "folder-1", "a.json"),
        type: CoatManifestFileType.Json,
        relativePath: "folder-1/a.json",
        content: JSON.stringify({ a: true }),
        hash: getFileHash(JSON.stringify({ a: true })),
        local: false,
        once: false,
      },
      {
        file: path.join(testCwd, "folder-1", "b.json"),
        type: CoatManifestFileType.Json,
        relativePath: "folder-1/b.json",
        content: JSON.stringify({ b: true }),
        hash: getFileHash(JSON.stringify({ b: true })),
        local: true,
        once: false,
      },
    ];

    const fileOperations = getFileOperations(
      filesToPlace,
      [],
      currentFiles,
      testContext
    );

    expect(fileOperations).toHaveLength(2);
    filesToPlace.forEach((file) => {
      expect(fileOperations).toContainEqual({
        absolutePath: file.file,
        relativePath: file.relativePath,
        content: file.content,
        local: file.local,
        prompt: UpdatePrompt.FirstUpdate,
        type: FileOperationType.UpdateWithPrompt,
      });
    });
  });
  test("should prompt when updating multiple continuous files but their disk content has been modified", () => {
    // Put continuous files in currentFiles
    const currentFiles = {
      [getNormalizedFilePath("folder-1/a.json", testContext)]: JSON.stringify({
        a: false,
      }),
      [getNormalizedFilePath("folder-1/b.json", testContext)]: JSON.stringify({
        b: false,
      }),
    };

    const filesToPlace: PolishedFile[] = [
      {
        file: path.join(testCwd, "folder-1", "a.json"),
        type: CoatManifestFileType.Json,
        relativePath: "folder-1/a.json",
        content: JSON.stringify({ a: true }),
        hash: getFileHash(JSON.stringify({ a: true })),
        local: false,
        once: false,
      },
      {
        file: path.join(testCwd, "folder-1", "b.json"),
        type: CoatManifestFileType.Json,
        relativePath: "folder-1/b.json",
        content: JSON.stringify({ b: true }),
        hash: getFileHash(JSON.stringify({ b: true })),
        local: true,
        once: false,
      },
    ];

    const context = produce(testContext, (newContext: CoatContext) => {
      newContext.coatGlobalLockfile.files.push({
        path: filesToPlace[0].relativePath,
        once: false,
        hash: getFileHash(JSON.stringify({ a: true })),
      });
      newContext.coatGlobalLockfile.files.push({
        path: filesToPlace[1].relativePath,
        once: false,
        hash: getFileHash(JSON.stringify({ b: true })),
      });
    });

    const fileOperations = getFileOperations(
      filesToPlace,
      [],
      currentFiles,
      context
    );

    expect(fileOperations).toHaveLength(2);
    filesToPlace.forEach((file) => {
      expect(fileOperations).toContainEqual({
        absolutePath: file.file,
        relativePath: file.relativePath,
        content: file.content,
        local: file.local,
        prompt: UpdatePrompt.Update,
        type: FileOperationType.UpdateWithPrompt,
      });
    });
  });
});
