import mergeWith from "lodash/mergeWith";
import {
  COAT_GLOBAL_LOCKFILE_VERSION,
  COAT_LOCAL_LOCKFILE_VERSION,
} from "../constants";
import {
  CoatGlobalLockfile,
  CoatGlobalLockfileStrict,
  CoatLocalLockfile,
  CoatLocalLockfileStrict,
} from "../types/coat-lockfiles";

function mergeWithArrayReplacement(source: unknown, target: unknown): unknown {
  // Replace arrays rather than merging them
  if (Array.isArray(target) && Array.isArray(source)) {
    return target;
  }
}

/**
 * Updates a local lockfile and returns the updated copy
 *
 * @param currentLockfile The current local lockfile
 * @param newLockfile New lockfile properties, will be merged with the current lockfile
 */
export function updateLocalLockfile(
  currentLockfile: CoatLocalLockfileStrict,
  newLockfile: Partial<CoatLocalLockfile>
): CoatLocalLockfileStrict {
  return mergeWith(
    {},
    currentLockfile,
    { version: COAT_LOCAL_LOCKFILE_VERSION },
    newLockfile,
    mergeWithArrayReplacement
  );
}

/**
 * Updates a global lockfile and returns the updated copy
 *
 * @param currentLockfile The current global lockfile
 * @param newLockfile New lockfile properties, will be merged with the current lockfile
 */
export function updateGlobalLockfile(
  currentLockfile: CoatGlobalLockfileStrict,
  newLockfile: Partial<CoatGlobalLockfile>
): CoatGlobalLockfileStrict {
  return mergeWith(
    {},
    currentLockfile,
    { version: COAT_GLOBAL_LOCKFILE_VERSION },
    newLockfile,
    mergeWithArrayReplacement
  );
}
