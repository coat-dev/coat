import { promises as fs } from "fs";
import path from "path";
import yaml from "js-yaml";
import { COAT_LOCKFILE_FILENAME } from "../constants";
import { CoatLockfile } from "../types/coat-lockfile";

export async function getCoatLockfile(
  cwd: string
): Promise<CoatLockfile | undefined> {
  let lockfileRaw: string | undefined;
  try {
    lockfileRaw = await fs.readFile(
      path.join(cwd, COAT_LOCKFILE_FILENAME),
      "utf-8"
    );
  } catch (error) {
    // Throw if error is anything other than "not found"
    if (error.code !== "ENOENT") {
      throw error;
    }
    return;
  }

  const lockfile = yaml.safeLoad(lockfileRaw) as CoatLockfile;

  // TODO: See #32
  // Lockfile validation

  return lockfile;
}
