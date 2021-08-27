import { promises as fs } from "fs";
import path from "path";
import { PackageJson } from "type-fest";
import { PACKAGE_JSON_FILENAME } from "../constants";

/**
 * Reads and parses the package.json file in the specified directory or returns undefined if it doesn't exist
 *
 * @param cwd The working directory
 */
export async function getPackageJson(
  cwd: string
): Promise<PackageJson | undefined> {
  try {
    const packageJsonRaw = await fs.readFile(
      path.join(cwd, PACKAGE_JSON_FILENAME),
      "utf-8"
    );
    return JSON.parse(packageJsonRaw);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
    // If the file is not available, packageJson will
    // be undefined in the coatManifest
  }
}
