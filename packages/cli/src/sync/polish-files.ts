import { getPolishFunction } from "../file-types";
import { CoatManifestMergedFile } from "../types/coat-manifest-file";
import { CoatContext } from "../types/coat-context";

interface PolishedFile {
  file: string;
  content: string;
}

/**
 * Polishes all files and converts their content into strings.
 *
 * Files are polished depending on their type,
 * e.g. JSON and YAML files are styled with prettier while
 * TEXT files end with a consistent trailing new line.
 *
 * @param files All files that should be polished
 * @param context The context of the current coat project
 */
export function polishFiles(
  files: CoatManifestMergedFile[],
  context: CoatContext
): PolishedFile[] {
  return files.map((file) => {
    const polishFunction = getPolishFunction(file);
    const content = polishFunction(file.content, file.file, context);
    return {
      file: file.file,
      content,
    };
  });
}
