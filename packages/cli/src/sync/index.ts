import fs from "fs-extra";
import execa from "execa";
import ora from "ora";
import flatten from "lodash/flatten";
import { mergeFiles } from "./merge-files";
import { mergeScripts } from "./merge-scripts";
import { mergeDependencies } from "./merge-dependencies";
import {
  CoatManifestFile,
  CoatManifestGroupedFile,
  CoatManifestFileType,
} from "../types/coat-manifest-file";
import { PACKAGE_JSON_FILENAME } from "../constants";
import { JsonObject, PackageJson } from "type-fest";
import { polishFiles } from "./polish-files";
import isEqual from "lodash/isEqual";
import { CoatManifestStrict } from "../types/coat-manifest";
import { generateLockfileFiles } from "../lockfiles/generate-lockfile-files";
import { getUnmanagedFiles } from "./get-unmanaged-files";
import { deleteFile } from "../util/delete-file";
import { getAllTemplates } from "../util/get-all-templates";
import { updateLockfiles } from "../lockfiles/update-lockfiles";
import { setup } from "../setup";
import produce from "immer";
import { groupFiles } from "./group-files";

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
 * @param cwd The working directory of the current coat project
 */
export async function sync(cwd: string): Promise<void> {
  // Run setup tasks that have not been run before
  // TODO: See #36
  // Let user skip setup tasks if they should be run later
  let context = await setup(cwd, false);

  // Gather all extended templates
  const allTemplates = getAllTemplates(context);

  // Merge scripts
  const mergedScripts = mergeScripts(
    allTemplates.map((template) => template.scripts)
  );
  const scripts = {
    ...context.packageJson.scripts,
    ...mergedScripts,
  };

  // Merge dependencies
  // Add current dependencies from package.json, to satisfy the
  // correct minimum required versions for potentially existing dependencies
  const currentDependencies: CoatManifestStrict["dependencies"] = {
    ...(context.packageJson.dependencies && {
      dependencies: context.packageJson.dependencies,
    }),
    ...(context.packageJson.devDependencies && {
      devDependencies: context.packageJson.devDependencies,
    }),
    ...(context.packageJson.optionalDependencies && {
      optionalDependencies: context.packageJson.optionalDependencies,
    }),
    ...(context.packageJson.peerDependencies && {
      peerDependencies: context.packageJson.peerDependencies,
    }),
  };
  const mergedDependencies = mergeDependencies([
    currentDependencies,
    ...allTemplates.map((template) => template.dependencies),
  ]);

  // Add package.json file entry that can be merged and customized
  const packageJsonFileContent = {
    ...context.packageJson,
    ...mergedDependencies,
    ...(Object.keys(scripts).length && { scripts }),
  };
  const packageJsonFileEntry: CoatManifestFile = {
    type: CoatManifestFileType.Json,
    file: PACKAGE_JSON_FILENAME,
    content: packageJsonFileContent as JsonObject,
  };
  // Update package.json in context
  // to let files access the newest version
  context = produce(context, (draft) => {
    draft.packageJson = packageJsonFileContent;
  });

  const allFiles = [
    packageJsonFileEntry,
    // Node.js 10 compatibility
    // Use Array.flatMap once Node 10 is no longer supported
    ...flatten(allTemplates.map((template) => template.files)),
  ];
  // Group files by file path
  const groupedFiles = groupFiles(allFiles, context);

  // Exclude one-time files that have already been generated
  const previouslyPlacedFiles = new Set(
    [
      ...context.coatGlobalLockfile.files,
      ...context.coatLocalLockfile.files,
    ].map((file) => file.path)
  );

  // Group by files that should only be placed once
  // and have already been placed in a previous run of coat sync
  const { onceAlreadyPlaced, filesToMerge } = Object.values(
    groupedFiles
  ).reduce<{
    onceAlreadyPlaced: { [filePath: string]: CoatManifestGroupedFile };
    filesToMerge: { [filePath: string]: CoatManifestGroupedFile };
  }>(
    (accumulator, file) => {
      let targetProperty;
      if (file.once && previouslyPlacedFiles.has(file.relativePath)) {
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
  const lockfileCandidates = [
    ...Object.values(onceAlreadyPlaced),
    ...mergedFiles,
  ];
  const localLockfileFileEntries = lockfileCandidates.filter(
    (file) => !!file.local
  );
  const globalLockfileFileEntries = lockfileCandidates.filter(
    (file) => !file.local
  );
  const newLocalLockfileFiles = generateLockfileFiles(localLockfileFileEntries);
  const newGlobalLockfileFiles = generateLockfileFiles(
    globalLockfileFileEntries
  );

  const filesToRemove = [
    ...getUnmanagedFiles(
      newLocalLockfileFiles,
      context.coatLocalLockfile,
      context
    ),
    ...getUnmanagedFiles(
      newGlobalLockfileFiles,
      context.coatGlobalLockfile,
      context
    ),
  ];

  // Update the lockfiles with the new file entries
  //
  // The method is kicked off immediately, to run concurrently
  // to the file system operations
  const updateLockfilesPromise = updateLockfiles({
    updatedGlobalLockfile: { files: newGlobalLockfileFiles },
    updatedLocalLockfile: { files: newLocalLockfileFiles },
    context,
  });
  updateLockfilesPromise.catch(() => {
    // Add an empty catch block to not throw any unhandled rejection
    // issues.
    //
    // The promise is still await later, therefore errors will still be
    // propagated correctly.
  });

  // Remove files first before placing the new files to not run into a race
  // condition where a local file has been converted to a global file,
  // or vice versa
  await Promise.all(
    // Remove files that are no longer managed by coat
    filesToRemove.map(deleteFile)
  );

  // Place new files
  await Promise.all(
    // Use fs.outputFile to automatically create any missing directories
    polishedFiles.map((file) => fs.outputFile(file.file, file.content))
  );

  context = await updateLockfilesPromise;

  // Retrieve dependencies after merging to run npm install if they have changed
  //
  // If the package.json file still exists, it has to be a JsonObject,
  // since an altered file type would throw an error during merging
  const mergedPackageJson = mergedFiles.find(
    (file) => file.relativePath === PACKAGE_JSON_FILENAME
  )?.content as PackageJson | undefined;
  if (mergedPackageJson) {
    const finalDependencies = {
      ...(mergedPackageJson.dependencies && {
        dependencies: mergedPackageJson.dependencies,
      }),
      ...(mergedPackageJson.devDependencies && {
        devDependencies: mergedPackageJson.devDependencies,
      }),
      ...(mergedPackageJson.optionalDependencies && {
        optionalDependencies: mergedPackageJson.optionalDependencies,
      }),
      ...(mergedPackageJson.peerDependencies && {
        peerDependencies: mergedPackageJson.peerDependencies,
      }),
    };

    if (!isEqual(finalDependencies, currentDependencies)) {
      const installSpinner = ora("Installing dependencies").start();
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
