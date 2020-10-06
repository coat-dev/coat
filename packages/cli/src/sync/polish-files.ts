import { getPolishFunction } from "../file-types";
import { CoatManifestMergedFile } from "../types/coat-manifest-file";
import { CoatContext } from "../types/coat-context";
import { getFileHash } from "../util/get-file-hash";

interface PolishedFileBase extends CoatManifestMergedFile {
  content: string;
}

export interface PolishedOnceFile extends PolishedFileBase {
  once: true;
}

export interface PolishedContinuousFile extends PolishedFileBase {
  once: false;
  hash: string;
}

export type PolishedFile = PolishedOnceFile | PolishedContinuousFile;

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
    if (file.once) {
      return {
        ...file,
        content,
        once: true,
      };
    }
    return {
      ...file,
      once: false,
      content,
      hash: getFileHash(content),
    };
  });
}
