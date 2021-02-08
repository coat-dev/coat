import mergeWith from "lodash/mergeWith";
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
 * Updates a lockfile and returns the updated copy
 *
 * @param currnetLockfile The current lockfile
 * @param newLockfile New lockfile properties, will be merged with the current lockfile
 */
export function updateLockfile<
  StrictLockfileType extends CoatGlobalLockfileStrict | CoatLocalLockfileStrict,
  LockfileType extends CoatGlobalLockfile | CoatLocalLockfile
>(
  currentLockfile: StrictLockfileType,
  newLockfile: Partial<LockfileType>
): StrictLockfileType {
  return mergeWith({}, currentLockfile, newLockfile, mergeWithArrayReplacement);
}
