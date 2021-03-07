import { promises as fs } from "fs";
import path from "path";
import yaml from "js-yaml";
import chalk from "chalk";
import {
  COAT_GLOBAL_LOCKFILE_PATH,
  COAT_GLOBAL_LOCKFILE_VERSION,
  COAT_LOCAL_LOCKFILE_VERSION,
  COAT_LOCAL_LOCKFILE_PATH,
} from "../constants";
import {
  CoatGlobalLockfile,
  CoatGlobalLockfileStrict,
  CoatLocalLockfile,
  CoatLocalLockfileStrict,
} from "../types/coat-lockfiles";
import {
  getStrictCoatGlobalLockfile,
  getStrictCoatLocalLockfile,
} from "./get-strict-coat-lockfiles";
import {
  getCoatGlobalLockfileValidator,
  getCoatLocalLockfileValidator,
} from "../util/get-validator";

const initialCoatGlobalLockfile: CoatGlobalLockfile = {
  version: COAT_GLOBAL_LOCKFILE_VERSION,
};
const initialCoatLocalLockfile: CoatLocalLockfile = {
  version: COAT_LOCAL_LOCKFILE_VERSION,
};

/**
 * Retrieves the parsed version of the coat global lockfile
 * that is placed in project-dir/coat.lock
 *
 * If no lockfile exists (yet), an initial empty lockfile is returned
 *
 * @param cwd Working directory of the coat project
 */
export async function getCoatGlobalLockfile(
  cwd: string
): Promise<CoatGlobalLockfileStrict> {
  let lockfile = initialCoatGlobalLockfile;
  try {
    const lockfileRaw = await fs.readFile(
      path.join(cwd, COAT_GLOBAL_LOCKFILE_PATH),
      "utf-8"
    );
    lockfile = yaml.load(lockfileRaw) as CoatGlobalLockfile;
  } catch (error) {
    // Throw if error is anything other than "not found"
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  const validate = await getCoatGlobalLockfileValidator();
  if (!validate(lockfile)) {
    console.warn(
      `${chalk.yellow("Warning!")} The global lockfile ${chalk.green(
        COAT_GLOBAL_LOCKFILE_PATH
      )} does not conform to the expected schema! Consider deleting and regenerating the lockfile in case you run into any issues.\nThe following issues have been found:`
    );
    console.warn(validate.errors);
  }

  return getStrictCoatGlobalLockfile(lockfile);
}

/**
 * Retrieves the parsed version of the coat local lockfile
 * that is placed in project-dir/.coat/coat.lock
 *
 * If no lockfile exists (yet), an initial empty lockfile is returned
 *
 * @param cwd Working directory of the coat project
 */
export async function getCoatLocalLockfile(
  cwd: string
): Promise<CoatLocalLockfileStrict> {
  let lockfile = initialCoatLocalLockfile;
  try {
    const lockfileRaw = await fs.readFile(
      path.join(cwd, COAT_LOCAL_LOCKFILE_PATH),
      "utf-8"
    );
    lockfile = yaml.load(lockfileRaw) as CoatGlobalLockfileStrict;
  } catch (error) {
    // Throw if error is anything other than "not found"
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  const validate = await getCoatLocalLockfileValidator();
  if (!validate(lockfile)) {
    console.warn(
      `${chalk.yellow("Warning!")} The local lockfile ${chalk.green(
        COAT_LOCAL_LOCKFILE_PATH
      )} does not conform to the expected schema! Consider deleting and regenerating the lockfile in case you run into any issues.\nThe following issues have been found:`
    );
    console.warn(validate.errors);
  }

  return getStrictCoatLocalLockfile(lockfile);
}
