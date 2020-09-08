import { promises as fs } from "fs";
import path from "path";
import importFrom from "import-from";
import {
  CoatManifestFile,
  CoatManifestFileContentType,
  CoatManifestMergedFile,
  CoatManifestFileContentTypesMap,
  CoatManifestGroupedFile,
} from "../types/coat-manifest-file";
import { CoatContext } from "../types/coat-context";
import { getMergeFunction } from "../file-types";

async function mergeFileContent(
  file: CoatManifestGroupedFile
): Promise<CoatManifestMergedFile | null> {
  let content: CoatManifestFileContentType | null | undefined;

  for (const contentEntry of file.content) {
    // null values to remove the file have been already handled
    // previously, therefore target is a valid content value
    const targetContent = contentEntry as Exclude<typeof contentEntry, null>;

    if (typeof targetContent === "function") {
      // If content is a function, the type of the function needs to be
      // casted since TypeScript does not understand the correlation
      // between a file's type and its content yet.
      const targetContentFunction = targetContent as (
        previous:
          | CoatManifestFileContentTypesMap[typeof file.type]
          | undefined
          | null
      ) =>
        | null
        | CoatManifestFileContentTypesMap[typeof file.type]
        | Promise<null | CoatManifestFileContentTypesMap[typeof file.type]>;
      content = await targetContentFunction(content);
    } else {
      // Merge based on the file type
      const mergeFunction = getMergeFunction(file);
      content = mergeFunction(content, targetContent);
    }
  }

  // Return null if file should not be placed
  if (content === null) {
    return null;
  }

  return {
    ...file,
    content: content as NonNullable<typeof content>,
  };
}

/**
 * Merges all files with potential customizations that are available
 * in the current coat project.
 *
 * @param allFiles All grouped files that should be merged
 * @param context The context of the current coat project
 */
export async function mergeFiles(
  allFiles: { [filePath: string]: CoatManifestGroupedFile },
  context: CoatContext
): Promise<CoatManifestMergedFile[]> {
  // When the content property of a file is set to null
  // the file should not be placed.
  //
  // If this is the case, the file entry can be removed
  const allFilesFiltered = Object.values(allFiles).reduce<{
    [filePath: string]: CoatManifestGroupedFile;
  }>((accumulator, file) => {
    const filteredContent = file.content.reduce<typeof file["content"]>(
      (accumulator, contentEntry) => {
        if (contentEntry === null) {
          return [];
        }
        accumulator.push(contentEntry);
        return accumulator;
      },
      []
    );

    if (filteredContent.length) {
      accumulator[file.file] = {
        ...file,
        content: filteredContent,
      };
    }
    return accumulator;
  }, {});

  // Gather customizations
  const filesWithCustomizationsGrouped = await Promise.all(
    Object.entries(allFilesFiltered).map(async ([filePath, file]) => {
      if (file.once) {
        // Files that should only be generated once should not
        // be customizable, because they can be edited directly
        return [filePath, file];
      }

      // Check whether a customization file exists
      //
      // TODO: See #35
      // Support additional customizations
      // like {file}-custom, {file}-custom.ts, {file}-custom.json (for JSON files)
      const customizationFilePath = `${filePath}-custom.js`;
      const relativeCustomizationFilePath = `./${path.relative(
        context.cwd,
        customizationFilePath
      )}`;

      try {
        await fs.stat(customizationFilePath);
        // File exists
      } catch (error) {
        if (error.code === "ENOENT") {
          // File does not exist -> no customization
          return [filePath, file];
        }
        // File can't be accessed or there is another issue
        // TODO: See #15
        // Better error message
        throw error;
      }

      // Import the file and add to files array
      //
      // TODO: See #15
      // Catch error and show a nice error message that
      // requiring the customization file has errors
      // (e.g. due to parsing issues)
      const customizationFile = importFrom(
        context.cwd,
        relativeCustomizationFilePath
      ) as CoatManifestFile["content"] | null;

      // If the customizationFile exports null, the file should not be placed
      // on the filesystem. Return null, to filter out this fileGroup
      if (customizationFile === null) {
        return null;
      }

      const newFileContent: typeof file.content = [
        ...file.content,
        customizationFile,
      ];
      return [
        filePath,
        {
          ...file,
          content: newFileContent,
        },
      ];
    })
  );

  const mergedFiles = await Promise.all(
    filesWithCustomizationsGrouped
      .filter(
        (entry): entry is [string, CoatManifestGroupedFile] => entry !== null
      )
      .map(([, file]) => mergeFileContent(file))
  );

  const validFiles = mergedFiles.filter(
    (file): file is CoatManifestMergedFile => file !== null
  );

  return validFiles;
}
