import { promises as fs } from "fs";
import path from "path";
import flatten from "lodash/flatten";
import importFrom from "import-from";
import { CoatManifestStrict } from "../types/coat-manifest";
import {
  CoatManifestFile,
  CoatManifestFileType,
  CoatManifestFileContentType,
  CoatManifestMergedFile,
  CoatManifestFileContentTypesMap,
  CoatManifestFileBase,
} from "../types/coat-manifest-file";
import { CoatContext } from "../types/coat-context";
import { getNormalizedFilePath } from "../util/get-normalized-file-path";
import { getMergeFunction } from "../file-types";

async function mergeFileEntries(
  filePath: string,
  files: CoatManifestFile[]
): Promise<CoatManifestMergedFile | null> {
  let content: CoatManifestFileContentType | null | undefined;
  let fileType: CoatManifestFileType | undefined;

  for (const file of files) {
    // Validate file type
    if (typeof fileType === "undefined") {
      fileType = file.type;
    } else if (fileType !== file.type) {
      // TODO: See #15
      // Better error message
      throw new Error("Mismatching file types for same file path");
    }

    // null values to remove the file have been already handled
    // previously, therefore target is a valid content value
    const targetContent = file.content as Exclude<typeof file.content, null>;

    if (typeof targetContent === "function") {
      // If content is a function, the type of the function needs to be
      // casted since TypeScript does not understand the correlation
      // between a file's type and its content yet.
      const targetContentFunction = targetContent as (
        previous:
          | CoatManifestFileContentTypesMap[typeof file.type]
          | undefined
          | null
      ) => null | CoatManifestFileContentTypesMap[typeof file.type];
      content = targetContentFunction(content);
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
    file: filePath,
    content: content as NonNullable<typeof content>,
    type: fileType as NonNullable<typeof fileType>,
  };
}

export async function mergeFiles(
  fileEntries: CoatManifestStrict["files"][],
  context: CoatContext
): Promise<CoatManifestMergedFile[]> {
  // Node.js 10 compatibility
  // Use templates.flatMap once Node 10 is no longer supported
  const allFiles = flatten(fileEntries);

  // Group files by normalized file paths
  const filesGrouped = allFiles.reduce<{
    [filePath: string]: CoatManifestFile[];
  }>((fileMap, file) => {
    const filePath = getNormalizedFilePath(file.file, context);
    if (!fileMap[filePath]) {
      fileMap[filePath] = [];
    }

    // When the content property of a file is set to null
    // the file should not be placed.
    //
    // If this is the case, all previous entries for a path
    // can be removed.
    const shouldFileBePlaced = file.content !== null;
    if (!shouldFileBePlaced) {
      delete fileMap[filePath];
    } else {
      fileMap[filePath].push(file);
    }

    return fileMap;
  }, {});

  // Gather customizations
  const filesWithCustomizationsGrouped = await Promise.all(
    Object.entries(filesGrouped).map(async ([filePath, files]) => {
      // Check whether a customization file exists
      //
      // TODO: Support additional customizations
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
          return [filePath, files];
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

      const newFiles: CoatManifestFile[] = [
        ...files,
        {
          file: filePath,
          // TypeScript can not correlate between types, therefore
          // the type and content are casted to a Json file, although
          // other file types are also allowed
          type: files[0].type as CoatManifestFileBase<
            CoatManifestFileType.Json
          >["type"],
          content: customizationFile as CoatManifestFileBase<
            CoatManifestFileType.Json
          >["content"],
        },
      ];
      return [filePath, newFiles];
    })
  );

  const mergedFiles = await Promise.all(
    filesWithCustomizationsGrouped
      .filter((entry): entry is [string, CoatManifestFile[]] => entry !== null)
      .map(([filePath, files]) => mergeFileEntries(filePath, files))
  );

  const validFiles = mergedFiles.filter(
    (file): file is CoatManifestMergedFile => file !== null
  );

  return validFiles;
}
