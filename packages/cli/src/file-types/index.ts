import {
  CoatManifestFileType,
  CoatManifestFileContentTypesMap,
  CoatManifestMergedFile,
  CoatManifestGroupedFile,
} from "../types/coat-manifest-file";
import { jsonFileFunctions } from "./json";
import { CoatContext } from "../types/coat-context";
import { textFileFunctions } from "./text";
import { yamlFileFunctions } from "./yaml";

export interface FileTypeFunctions<ContentType> {
  /**
   * Merges the source and the target content
   */
  merge: (
    source: ContentType | null | undefined,
    target: ContentType
  ) => ContentType | null;
  /**
   * Converts the content of the file
   * to a string and styles the result,
   * usually using prettier
   */
  polish: (
    source: ContentType,
    filePath: string,
    context: CoatContext
  ) => string;
}

type FileTypeRegistry = {
  [type in CoatManifestFileType]: FileTypeFunctions<
    CoatManifestFileContentTypesMap[type]
  >;
};

const fileTypeRegistry: FileTypeRegistry = {
  [CoatManifestFileType.Json]: jsonFileFunctions,
  [CoatManifestFileType.Text]: textFileFunctions,
  [CoatManifestFileType.Yaml]: yamlFileFunctions,
};

/**
 * Retrieves the merge function for the specified file type.
 * This function is currently necessary to correctly cast the
 * type of the merge function to the correct file type.
 */
export function getMergeFunction<FileType extends CoatManifestGroupedFile>(
  file: FileType
): FileTypeFunctions<
  CoatManifestFileContentTypesMap[FileType["type"]]
>["merge"] {
  const fileFunctions = fileTypeRegistry[file.type];
  if (!fileFunctions) {
    throw new Error(`Cannot merge unknown file type: ${file.type}`);
  }
  return fileFunctions.merge as (
    source:
      | CoatManifestFileContentTypesMap[FileType["type"]]
      | null
      | undefined,
    target: CoatManifestFileContentTypesMap[FileType["type"]]
  ) => CoatManifestFileContentTypesMap[FileType["type"]] | null;
}

/**
 * Retrieves the polish function for the specified file type.
 * This function is currently necessary to correctly cast the
 * type of the polish function to the correct file type.
 */
export function getPolishFunction<FileType extends CoatManifestMergedFile>(
  file: FileType
): FileTypeFunctions<
  CoatManifestFileContentTypesMap[FileType["type"]]
>["polish"] {
  const fileFunctions = fileTypeRegistry[file.type];
  if (!fileFunctions) {
    throw new Error(`Cannot polish unknown file type: ${file.type}`);
  }
  return fileFunctions.polish as (
    source: CoatManifestFileContentTypesMap[FileType["type"]],
    filePath: string,
    context: CoatContext
  ) => string;
}
