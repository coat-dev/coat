import path from "path";
import { COAT_LOCKFILE_VERSION, PACKAGE_JSON_FILENAME } from "../constants";
import { CoatContext } from "../types/coat-context";
import { CoatLockfile } from "../types/coat-lockfile";

export function generateLockfile(
  files: string[],
  context: CoatContext
): CoatLockfile {
  const lockfileFiles = files
    .map((filePath) => ({
      // File paths should be relative from the coat project
      path: path
        .relative(context.cwd, filePath)
        // File paths should always use forward slashes
        .split(path.sep)
        .join(path.posix.sep),
    }))
    // The root package.json file next to the coat manifest file
    // should not be included in the lockfile
    .filter((file) => file.path !== PACKAGE_JSON_FILENAME);

  // Sort lockfile files alphabetically
  lockfileFiles.sort((a, b) => a.path.localeCompare(b.path));

  return {
    version: COAT_LOCKFILE_VERSION,
    files: lockfileFiles,
  };
}
