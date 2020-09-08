import mergeWith from "lodash/mergeWith";
import isEqual from "lodash/isEqual";
import { produce } from "immer";
import { CoatGlobalLockfile, CoatLocalLockfile } from "../types/coat-lockfiles";
import { CoatContext } from "../types/coat-context";
import { writeGlobalLockfile, writeLocalLockfile } from "./write-lockfiles";

interface UpdateLockfilesOptions {
  updatedGlobalLockfile?: Partial<CoatGlobalLockfile>;
  updatedLocalLockfile?: Partial<CoatLocalLockfile>;
  context: CoatContext;
}

function mergeWithArrayReplacement(source: unknown, target: unknown): unknown {
  // Replace arrays rather than merging them
  if (Array.isArray(target) && Array.isArray(source)) {
    return target;
  }
}

/**
 * Updates both lockfiles and returns an updated coat context
 * that contains the new lockfile content
 *
 * @param options.updatedGlobalLockfile New global lockfile properties,
 * will be merged with the current global lockfile
 * @param options.updatedLocalLockfile New local lockfile properties,
 * will be merged with the current local lockfile
 * @param options.context The current coat context
 */
export async function updateLockfiles({
  updatedGlobalLockfile,
  updatedLocalLockfile,
  context,
}: UpdateLockfilesOptions): Promise<CoatContext> {
  const mergedGlobalLockfile = mergeWith(
    {},
    context.coatGlobalLockfile,
    updatedGlobalLockfile,
    mergeWithArrayReplacement
  );
  const mergedLocalLockfile = mergeWith(
    {},
    context.coatLocalLockfile,
    updatedLocalLockfile,
    mergeWithArrayReplacement
  );

  const promises: Promise<void>[] = [];
  if (!isEqual(mergedGlobalLockfile, context.coatGlobalLockfile)) {
    promises.push(writeGlobalLockfile(mergedGlobalLockfile, context));
  }
  if (!isEqual(mergedLocalLockfile, context.coatLocalLockfile)) {
    promises.push(writeLocalLockfile(mergedLocalLockfile, context));
  }

  await Promise.all(promises);

  // Return a new coat context with the updated lockfiles
  return produce(context, (draft) => {
    draft.coatGlobalLockfile = mergedGlobalLockfile;
    draft.coatLocalLockfile = mergedLocalLockfile;
  });
}
