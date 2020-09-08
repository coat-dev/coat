import path from "path";
import { CoatContext } from "../types/coat-context";

/**
 * Returns the path of a file relative
 * to the root coat project directory.
 * Results will always use unix style "/" path separators.
 *
 * @param filePath The file path to retrieve the relative path
 * @param context The context of the current coat project
 */
export function getRelativeFilePath(
  filePath: string,
  context: CoatContext
): string {
  return (
    path
      .relative(context.cwd, filePath)
      // File paths should always use forward slashes
      .split(path.sep)
      .join(path.posix.sep)
  );
}
