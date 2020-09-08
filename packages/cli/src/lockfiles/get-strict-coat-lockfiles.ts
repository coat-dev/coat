import {
  CoatGlobalLockfileStrict,
  CoatGlobalLockfile,
  CoatLocalLockfile,
  CoatLocalLockfileStrict,
} from "../types/coat-lockfiles";

/**
 * Adds all missing properties to a parsed global lockfile,
 * to access these properties safely in following code
 *
 * @param lockfile The global lockfile that has been read from the disk
 */
export function getStrictCoatGlobalLockfile(
  lockfile: CoatGlobalLockfile
): CoatGlobalLockfileStrict {
  return {
    version: lockfile.version,
    files:
      lockfile.files?.map((file) => ({
        ...file,
        once: !!file.once,
      })) ?? [],
    setup: lockfile.setup ?? {},
  };
}

/**
 * Adds all missing properties to a parsed local lockfile,
 * to access these properties safely in following code
 *
 * @param lockfile The local lockfile that has been read from the disk
 */
export function getStrictCoatLocalLockfile(
  lockfile: CoatLocalLockfile
): CoatLocalLockfileStrict {
  return {
    version: lockfile.version,
    files:
      lockfile.files?.map((file) => ({
        ...file,
        once: !!file.once,
      })) ?? [],
    setup: lockfile.setup ?? {},
  };
}
