import { CoatContext } from "../types/coat-context";
import {
  CoatManifestFile,
  CoatManifestGroupedFile,
} from "../types/coat-manifest-file";
import { getNormalizedFilePath } from "../util/get-normalized-file-path";
import { getRelativeFilePath } from "../util/get-relative-file-path";

/**
 * Groups generated files by their normalized absolute path.
 *
 * Coat files are declared by a relative file path from the current coat
 * project. In order to merge files correctly, they are grouped by
 * their normalized absolute file path, in order to ensure that entries
 * that relate to the same files are merged and placed correctly.
 *
 * Example with edge cases:
 *
 * There might be two files that are placed by coat:
 * - file.json
 * - folder-1/../file.json
 *
 * Both relate to the same file, but their paths are not equal. Normalizing
 * and grouping them helps to merge them correctly and place them on the
 * file system with the expected result.
 *
 * @param files The files that shall be grouped
 * @param context The context of the current coat project
 */
export function groupFiles(
  files: CoatManifestFile[],
  context: CoatContext
): { [filePath: string]: CoatManifestGroupedFile } {
  return files.reduce<{
    [filePath: string]: CoatManifestGroupedFile;
  }>((accumulator, file) => {
    const normalizedPath = getNormalizedFilePath(file.file, context);

    // TODO: See #37
    // Validate that all files have the same file properties
    // e.g. type, once and local

    accumulator[normalizedPath] = {
      ...file,
      content: [...(accumulator[normalizedPath]?.content ?? []), file.content],
      once: !!file.once,
      local: !!file.local,
      file: normalizedPath,
      relativePath: getRelativeFilePath(normalizedPath, context),
    };

    return accumulator;
  }, {});
}
