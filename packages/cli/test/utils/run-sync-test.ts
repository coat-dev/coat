import { promises as fs } from "fs";
import path from "path";
import yaml from "js-yaml";
import { PackageJson } from "type-fest";
import { CoatManifest } from "../../src/types/coat-manifest";
import { RunCliResult, runCli } from "./run-cli";
import { getTmpDir } from "./get-tmp-dir";
import {
  PACKAGE_JSON_FILENAME,
  COAT_MANIFEST_FILENAME,
  COAT_LOCKFILE_FILENAME,
} from "../../src/constants";
import { CoatLockfile } from "../../src/types/coat-lockfile";

interface RunSyncTestOptions {
  /**
   * The package.json file that will be written
   * to the temporary directory.
   *
   * Default value:
   * {
   *   "name": "test-project",
   *   "version": "1.0.0",
   * }
   */
  packageJson?: PackageJson;
  /**
   * The coat.json manifest file that will be
   * written to the temporary directory.
   *
   * Default value:
   * {
   *   "name": "test-project",
   * }
   */
  coatManifest?: CoatManifest;
  /**
   * The coat.lock lockfile that will be
   * written to the temporary directory.
   *
   * Default value: No lockfile
   */
  coatLockfile?: CoatLockfile;
}

const testProjectName = "test-project";
const defaultPackageJson = {
  name: testProjectName,
  version: "1.0.0",
};
const defaultCoatManifest = {
  name: testProjectName,
};

/**
 * Creates and prepares a temporary directory
 * for a sync integration test with the specified
 * packageJson and coatManifest and returns the path
 * to the created directory.
 * If no options are specified,
 * default values will be used.
 *
 * @param options see the PrepareSyncTestOptions type
 * @returns the path to the temporary directory
 */
export async function prepareSyncTest(
  options?: RunSyncTestOptions
): Promise<string> {
  const tmpDir = getTmpDir();

  const packageJson = options?.packageJson || defaultPackageJson;
  const coatManifest = options?.coatManifest || defaultCoatManifest;

  const filePromises = [
    fs.writeFile(
      path.join(tmpDir, PACKAGE_JSON_FILENAME),
      JSON.stringify(packageJson)
    ),
    fs.writeFile(
      path.join(tmpDir, COAT_MANIFEST_FILENAME),
      JSON.stringify(coatManifest)
    ),
  ];

  if (options?.coatLockfile) {
    filePromises.push(
      fs.writeFile(
        path.join(tmpDir, COAT_LOCKFILE_FILENAME),
        yaml.safeDump(options.coatLockfile)
      )
    );
  }

  await Promise.all(filePromises);

  return tmpDir;
}

/**
 * Creates and prepares a temporary directory
 * for a sync integration test with the specified
 * packageJson and coatManifest entries and runs
 * "coat sync" from the created directory.
 * If no options are specified,
 * default values will be used.
 *
 * @param options see the PrepareSyncTestOptions type
 * @returns the cwd and sync task that has been executed
 */
export async function runSyncTest(
  options?: RunSyncTestOptions
): Promise<RunCliResult> {
  const tmpDir = await prepareSyncTest(options);

  return runCli(["sync"], tmpDir);
}
