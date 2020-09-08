import path from "path";
import { CoatContext } from "../types/coat-context";

/**
 * Returns the normalized absolute file path for a given path.
 * Results will always use unix style "/" path separators.
 *
 * Example:
 * folder-1\..\folder-2\file.json
 * ->
 * /absolute-path-to-project/folder-2/file.json
 *
 * @param filePath The path that shall be normalized
 * @param context The context of the current coat project
 */
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

  // Always use linux style path separators
  const usableFilePath = filePath.split(path.sep).join(path.posix.sep);

  // TODO: See #17
  // Disallow paths outside of the repository, throw error if path
  // is outside the coat project directory (this file should use
  // a path starting with "/" instead)
  return path.normalize(path.join(context.cwd, usableFilePath));
}
