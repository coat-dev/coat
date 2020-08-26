import { getPolishFunction } from "../file-types";
import { CoatManifestMergedFile } from "../types/coat-manifest-file";
import { CoatContext } from "../types/coat-context";

interface PolishedFile {
  file: string;
  content: string;
}

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
