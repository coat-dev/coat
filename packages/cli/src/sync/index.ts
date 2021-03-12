import execa from "execa";
import ora from "ora";
import flatten from "lodash/flatten";
import fromPairs from "lodash/fromPairs";
import { mergeFiles } from "./merge-files";
import { mergeScripts } from "./merge-scripts";
import { mergeDependencies } from "./merge-dependencies";
import {
  CoatManifestFile,
  CoatManifestGroupedFile,
  CoatManifestFileType,
} from "../types/coat-manifest-file";
import {
  EVERYTHING_UP_TO_DATE_MESSAGE,
  PACKAGE_JSON_FILENAME,
} from "../constants";
import { JsonObject, PackageJson } from "type-fest";
import { polishFiles } from "./polish-files";
import isEqual from "lodash/isEqual";
import { CoatManifestStrict } from "../types/coat-manifest";
import { generateLockfileFiles } from "../lockfiles/generate-lockfile-files";
import { getUnmanagedFiles } from "./get-unmanaged-files";
import { getAllTemplates } from "../util/get-all-templates";
import {
  updateGlobalLockfile,
  updateLocalLockfile,
} from "../lockfiles/update-lockfile";
import { setup } from "../setup";
import produce from "immer";
import { groupFiles } from "./group-files";
import { getDefaultFiles } from "./get-default-files";
import { getCurrentFiles } from "./get-current-files";
import { FileOperationType, getFileOperations } from "./get-file-operations";
import { removeUnmanagedDependencies } from "./remove-unmanaged-dependencies";
import { getNormalizedFilePath } from "../util/get-normalized-file-path";
import {
  writeGlobalLockfile,
  writeLocalLockfile,
} from "../lockfiles/write-lockfiles";
import { promptForFileOperations } from "./prompt-for-file-operations";
import { performFileOperations } from "./perform-file-operations";
import chalk from "chalk";
import {
  createFileOperationLogMessage,
  Tense,
} from "./create-file-operation-log-message";

/**
 * Generates all files from the current coat project.
 *
 * The sync function gathers all extended templates of the current project
 * and merges all files that should be written to the project directory.
 *
 * Setup tasks that have not been run before will be run at the beginning
 * of the sync process, to ensure that the templates have access to the
 * latest configuration and task results that are required to generate
 * the project files.
 *
 * @param options.cwd The working directory of the current coat project
 * @param options.check Whether a dry-run should be performed that checks
 * and exits if the coat project is out of sync and has pending file updates
 */
export async function sync({
  cwd,
  check,
}: {
  cwd: string;
  check?: boolean;
}): Promise<void> {
  const checkFlag = !!check;
  // Run setup tasks that have not been run before
  //
  // TODO: See #36
  // Let user skip setup tasks if they should be run later
  let context = await setup({ cwd, check: checkFlag, force: false });

  // Gather all extended templates
  const allTemplates = getAllTemplates(context);

  // Merge scripts
  const { scripts: mergedScripts, parallelScriptPrefixes } = mergeScripts(
    allTemplates.map((template) => template.scripts)
  );

  // Get all current scripts from the project's package.json file
  //
  const previouslyManagedScripts = new Set(context.coatGlobalLockfile.scripts);
  // Node.js 10 compatibility
  // Use Object.fromEntries once Node 10 is no longer supported
  const currentScripts = fromPairs(
    Object.entries(context.packageJson?.scripts || {}).filter(
      ([scriptName]) =>
        // Filter out scripts that have been added / managed by coat.
        // They will be re-added from mergedScripts or will be removed
        // in case the coat manifest or its templates no longer supply
        // a particular script
        !previouslyManagedScripts.has(scriptName) &&
        // Also filter out scripts that start with a script that is managed by
        // coat and will be run in parallel. This is done in order to ensure
        // that the scripts from coat are running as expected
        parallelScriptPrefixes.every((prefix) => !scriptName.startsWith(prefix))
    )
  );

  const scripts = {
    ...currentScripts,
    ...mergedScripts,
  };

  // Merge dependencies
  //
  // Add current dependencies from package.json, to satisfy the
  // correct minimum required versions for potentially existing dependencies
  const currentDependencies: CoatManifestStrict["dependencies"] = {
    dependencies: context.packageJson?.dependencies ?? {},
    devDependencies: context.packageJson?.devDependencies ?? {},
    optionalDependencies: context.packageJson?.optionalDependencies ?? {},
    peerDependencies: context.packageJson?.peerDependencies ?? {},
  };

  const templateDependencies = mergeDependencies(
    allTemplates.map((template) => template.dependencies)
  );

  // Remove dependencies that have been previously added
  // by coat, but are no longer a part of any template
  const strippedCurrentDependencies = removeUnmanagedDependencies(
    currentDependencies,
    templateDependencies,
    context
  );

  const mergedDependencies = mergeDependencies([
    strippedCurrentDependencies,
    templateDependencies,
  ]);

  const allFiles: CoatManifestFile[] = [];
  // Add package.json file entry that can be merged and customized
  const packageJsonFileContent: PackageJson = {
    ...context.packageJson,
    ...mergedDependencies,
    scripts,
  };

  // Remove empty dependency and scripts properties
  const keysToRemove = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
    "scripts",
  ];
  keysToRemove.forEach((key) => {
    if (
      !Object.keys(
        (packageJsonFileContent as Record<string, Record<string, string>>)[key]
      ).length
    ) {
      delete (packageJsonFileContent as Record<string, unknown>)[key];
    }
  });

  // Only add package.json to the allFiles array if it currently exists
  // or if the contents of the file have been updated by coat
  if (context.packageJson || !isEqual(packageJsonFileContent, {})) {
    allFiles.push({
      type: CoatManifestFileType.Json,
      file: PACKAGE_JSON_FILENAME,
      content: packageJsonFileContent as JsonObject,
    });

    // Update package.json in context
    // to let files access the newest version
    context = produce(context, (draft) => {
      draft.packageJson = packageJsonFileContent;
    });
  }

  // Add default files that are generated by coat sync
  const defaultFiles = getDefaultFiles();
  allFiles.push(...defaultFiles);

  // Add files from all templates
  allFiles.push(
    // Node.js 10 compatibility
    // Use Array.flatMap once Node 10 is no longer supported
    ...flatten(allTemplates.map((template) => template.files))
  );

  // Group files by file path
  const groupedFiles = groupFiles(allFiles, context);

  // Gather previously placed files to exclude one-time files
  // that have already been generated
  const previouslyPlacedFiles = [
    ...context.coatGlobalLockfile.files,
    ...context.coatLocalLockfile.files,
  ].map((file) => file.path);

  // Gather the files of which the current disk content
  // should be retrieved to determine they need to be updated
  const filesToRetrieve = [
    ...Object.keys(groupedFiles),
    ...previouslyPlacedFiles.map((relativePath) =>
      getNormalizedFilePath(relativePath, context)
    ),
  ];

  // Filter out duplicate file paths, since filesToRetrieve
  // contains both the current lockfile entries and new groupedFiles
  // keys that overlap for consecutive sync runs
  const filesToRetrieveUnique = [...new Set(filesToRetrieve)];

  // Retrieve the contents of the files
  const currentFiles = await getCurrentFiles(filesToRetrieveUnique);

  // Create a Set to easily access the generated file paths
  // when grouping files
  const previouslyPlacedFileSet = new Set(previouslyPlacedFiles);

  // Group by files that should only be placed once
  // and have already been placed in a previous run of coat sync
  const { onceAlreadyPlaced, filesToMerge } = Object.values(
    groupedFiles
  ).reduce<{
    onceAlreadyPlaced: {
      [filePath: string]: CoatManifestGroupedFile & { once: true };
    };
    filesToMerge: { [filePath: string]: CoatManifestGroupedFile };
  }>(
    (accumulator, file) => {
      let targetProperty:
        | typeof accumulator.filesToMerge
        | typeof accumulator.onceAlreadyPlaced;

      if (
        file.once &&
        // Check if the once file has already been placed via coat
        // and is tracked in a lockfile
        (previouslyPlacedFileSet.has(file.relativePath) ||
          // Even if the file has not yet been tracked in a lockfile
          // it should also not be placed if it already exists on the disk
          typeof currentFiles[file.file] !== "undefined")
      ) {
        targetProperty = accumulator.onceAlreadyPlaced;
      } else {
        targetProperty = accumulator.filesToMerge;
      }

      targetProperty[file.file] = file;

      return accumulator;
    },
    {
      onceAlreadyPlaced: {},
      filesToMerge: {},
    }
  );

  // Merge files
  const mergedFiles = await mergeFiles(filesToMerge, context);

  // Polish files and convert their content into strings to
  // be able to place them on the disk
  const polishedFiles = polishFiles(mergedFiles, context);

  // Generate new coat lockfile files property from merged files
  const lockFileCanditates = [
    ...Object.values(onceAlreadyPlaced),
    ...polishedFiles,
  ];

  // Split lockfile candidates by local and global file entries
  const {
    localLockFileEntries,
    globalLockFileEntries,
  } = lockFileCanditates.reduce<{
    localLockFileEntries: typeof lockFileCanditates;
    globalLockFileEntries: typeof lockFileCanditates;
  }>(
    (accumulator, file) => {
      if (file.local) {
        accumulator.localLockFileEntries.push(file);
      } else {
        accumulator.globalLockFileEntries.push(file);
      }
      return accumulator;
    },
    { localLockFileEntries: [], globalLockFileEntries: [] }
  );

  const newLocalLockFiles = generateLockfileFiles(localLockFileEntries);
  const newGlobalLockFiles = generateLockfileFiles(globalLockFileEntries);

  const filesToRemove = [
    ...getUnmanagedFiles(newLocalLockFiles, context.coatLocalLockfile).map(
      (unmanagedFile) => ({
        ...unmanagedFile,
        local: true,
      })
    ),
    ...getUnmanagedFiles(newGlobalLockFiles, context.coatGlobalLockfile).map(
      (unmanagedFile) => ({
        ...unmanagedFile,
        local: false,
      })
    ),
  ];

  // Determine necessary file operations:
  // Place or update new polished files and remove unmanaged files
  const fileOperations = getFileOperations(
    polishedFiles,
    filesToRemove,
    currentFiles,
    context
  );

  // --check flag
  if (checkFlag) {
    // If there are any pending global file operations that
    // are not skipped, the coat project is out of sync
    const pendingGlobalFileOperations = fileOperations.filter(
      (fileOperation) =>
        // Only check global file operations, pending local file operations
        // does not indicate that a coat project is out of sync
        !fileOperation.local &&
        //
        // Ignore delete operations that are skipped and purely logged
        // for information. This will however likely lead to the --check
        // still failing, since the lockfile will require an update.
        fileOperation.type !== FileOperationType.DeleteSkipped
    );
    if (pendingGlobalFileOperations.length) {
      const pendingFileOperationMessages = pendingGlobalFileOperations.map(
        (fileOperation) =>
          createFileOperationLogMessage(fileOperation, Tense.Future)
      );
      const messages = [
        "",
        `The ${chalk.cyan("coat")} project is not in sync.`,
        "There are pending file updates:",
        "",
        ...pendingFileOperationMessages,
        "",
        `Run ${chalk.cyan("coat sync")} to bring the project back in sync.`,
      ];
      console.error(messages.join("\n"));
      process.exit(1);
    }
  }

  // Prompt the user if there are dangerous file operations that might have
  // unintended consequences. See getFileOperations for operations that
  // lead to prompts
  const shouldPerformFileOperations = await promptForFileOperations(
    fileOperations
  );
  if (!shouldPerformFileOperations) {
    // If the prompt is declined, sync should be aborted and
    // coat should exit immediately.
    console.error("Aborting coat sync due to user request.");
    process.exit(1);
  }

  // Node.js 10 compatibility
  // Use Object.fromEntries once Node 10 is no longer supported
  const newLockfileDependencies = fromPairs(
    Object.entries(
      templateDependencies
    ).map(([dependencyKey, dependencyEntries]) => [
      dependencyKey,
      Object.keys(dependencyEntries).sort(),
    ])
  );

  const newLockfileScripts = Object.keys(mergedScripts).sort();

  // Update the lockfiles with the new file entries
  //
  // global lockfile
  const newGlobalLockfile = updateGlobalLockfile(context.coatGlobalLockfile, {
    files: newGlobalLockFiles,
    dependencies: newLockfileDependencies,
    scripts: newLockfileScripts,
  });
  if (!isEqual(context.coatGlobalLockfile, newGlobalLockfile)) {
    //
    // --check flag
    if (checkFlag) {
      // If the global lockfile needs to be updated,
      // the coat project is out of sync
      const messages = [
        "",
        `The ${chalk.cyan("coat")} project is not in sync.`,
        `The global lockfile (${chalk.green(
          "coat.lock"
        )}) needs to be updated.`,
        "",
        `Run ${chalk.cyan("coat sync")} to bring the project back in sync.`,
      ];
      console.error(messages.join("\n"));
      process.exit(1);
    }

    context = produce(context, (draft) => {
      draft.coatGlobalLockfile = newGlobalLockfile;
    });
    await writeGlobalLockfile(newGlobalLockfile, context);
  }

  if (checkFlag) {
    // sync --check can end here, the coat project is in sync
    console.log(`\n${EVERYTHING_UP_TO_DATE_MESSAGE}\n`);
  } else {
    // local lockfile
    const newLocalLockfile = updateLocalLockfile(context.coatLocalLockfile, {
      files: newLocalLockFiles,
    });
    if (!isEqual(context.coatLocalLockfile, newLocalLockfile)) {
      context = produce(context, (draft) => {
        draft.coatLocalLockfile = newLocalLockfile;
      });
      await writeLocalLockfile(newLocalLockfile, context);
    }

    // Update files on disk
    await performFileOperations(fileOperations);

    // Retrieve dependencies after merging to run npm install if they have changed
    //
    // If the package.json file still exists, it has to be a JsonObject,
    // since an altered file type would throw an error during merging
    const mergedPackageJson = mergedFiles.find(
      (file) => file.relativePath === PACKAGE_JSON_FILENAME
    )?.content as PackageJson | undefined;

    if (mergedPackageJson) {
      const finalDependencies: CoatManifestStrict["dependencies"] = {
        dependencies: mergedPackageJson.dependencies ?? {},
        devDependencies: mergedPackageJson.devDependencies ?? {},
        optionalDependencies: mergedPackageJson.optionalDependencies ?? {},
        peerDependencies: mergedPackageJson.peerDependencies ?? {},
      };

      if (!isEqual(finalDependencies, currentDependencies)) {
        const installSpinner = ora("Installing dependencies\n").start();
        try {
          await execa("npm", ["install"], { cwd: context.cwd });
          installSpinner.succeed();
        } catch (error) {
          installSpinner.fail();
          throw error;
        }
      }
    }
  }
}
