import fs from "fs-extra";
import path from "path";
import execa from "execa";
import { getContext } from "../util/get-context";
import { gatherExtendedTemplates } from "./gather-extended-templates";
import { mergeFiles } from "./merge-files";
import { mergeScripts } from "./merge-scripts";
import { mergeDependencies } from "./merge-dependencies";
import {
  CoatManifestFile,
  CoatManifestFileType,
  CoatManifestMergedFile,
} from "../types/coat-manifest-file";
import { COAT_LOCKFILE_FILENAME, PACKAGE_JSON_FILENAME } from "../constants";
import { JsonObject, PackageJson } from "type-fest";
import { polishFiles } from "./polish-files";
import isEqual from "lodash/isEqual";
import { CoatManifestStrict } from "../types/coat-manifest";
import { getNormalizedFilePath } from "../util/get-normalized-file-path";
import { generateLockfile } from "../util/generate-lockfile";
import { getUnmanagedFiles } from "./get-unmanaged-files";
import { deleteFile } from "../util/delete-file";

export async function sync(cwd: string): Promise<void> {
  // Get coat manifest from cwd
  const context = await getContext(cwd);

  // Gather all extended templates
  const extendedTemplates = gatherExtendedTemplates(context);
  // Include the current coat manifest as the final template that should
  // be applied.
  const allTemplates = [...extendedTemplates, context.coatManifest];

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
  const packageJsonFileEntry: [CoatManifestFile] = [
    {
      type: CoatManifestFileType.Json,
      file: PACKAGE_JSON_FILENAME,
      content: {
        ...(context.packageJson as JsonObject),
        ...mergedDependencies,
        ...(Object.keys(scripts).length && { scripts }),
      },
    },
  ];

  // Merge files
  const mergedFiles = await mergeFiles(
    [packageJsonFileEntry, ...allTemplates.map((template) => template.files)],
    context
  );

  // Generate new coat lockfile from merged files
  const newLockfile = generateLockfile(
    mergedFiles.map((file) => file.file),
    context
  );

  // Polish all merged files and the coat lockfile
  const filesToPolish: CoatManifestMergedFile[] = [
    ...mergedFiles,
    {
      file: path.join(context.cwd, COAT_LOCKFILE_FILENAME),
      content: newLockfile,
      type: CoatManifestFileType.Yaml,
    },
  ];

  const polishedFiles = polishFiles(filesToPolish, context);
  const filesToRemove = getUnmanagedFiles(newLockfile, context);

  await Promise.all([
    // Use fs.outputFile to automatically create any missing directories
    ...polishedFiles.map((file) => fs.outputFile(file.file, file.content)),
    // Remove files that are no longer managed by coat
    ...filesToRemove.map(deleteFile),
  ]);

  // Retrieve dependencies after merging to run npm install if they have changed
  //
  // If the package.json file still exists, it has to be a JsonObject, since an altered file type would throw
  // an error during merging
  const mergedPackageJson = mergedFiles.find(
    (file) =>
      file.file === getNormalizedFilePath(PACKAGE_JSON_FILENAME, context)
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
      await execa("npm", ["install"], { cwd: context.cwd, stdio: "inherit" });
    }
  }
}
