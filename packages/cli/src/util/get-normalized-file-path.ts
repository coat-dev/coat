import path from "path";
import { CoatContext } from "../types/coat-context";

export function getNormalizedFilePath(
  filePath: string,
  context: CoatContext
): string {
  // TODO: See #17
  // Paths starting with "/" should be placed from the root of the
  // git repository (e.g. for GitHub specific or CI configuration).
  //
  // Throw an error for now to indicate that this functionality is not yet
  // implemented
  if (filePath.startsWith("/")) {
    throw new Error(
      "Absolute paths of files from the repository root are not yet implemented"
    );
  }

  // Normalize path separators
  const usableFilePath = filePath.replace(/\//g, path.sep);

  // TODO: See #17
  // Disallow paths outside of the repository, throw error if path
  // is outside the coat project directory (this file should use
  // a path starting with "/" instead)
  return path.normalize(path.join(context.cwd, usableFilePath));
}
