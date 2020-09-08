import produce from "immer";
import isEqual from "lodash/isEqual";
import { WritableDraft } from "immer/dist/internal";
import { JsonObject } from "type-fest";
import {
  writeGlobalLockfile,
  writeLocalLockfile,
} from "../lockfiles/write-lockfiles";
import { CoatContext } from "../types/coat-context";
import {
  CoatGlobalLockfileStrict,
  CoatLocalLockfileStrict,
} from "../types/coat-lockfiles";
import { CoatManifestTaskStrict } from "../types/coat-manifest-tasks";

function stripTasks<
  CoatLockfileType extends CoatLocalLockfileStrict | CoatGlobalLockfileStrict
>(
  tasks: CoatManifestTaskStrict[],
  lockfile: CoatLockfileType
): CoatLockfileType {
  const taskIds = new Set(tasks.map((task) => task.id));

  return produce(lockfile, (draft) => {
    draft.setup = Object.entries(draft.setup).reduce<{
      [taskId: string]: WritableDraft<JsonObject>;
    }>((accumulator, [taskId, taskResult]) => {
      if (taskIds.has(taskId)) {
        accumulator[taskId] = taskResult;
      }
      return accumulator;
    }, {});
  });
}

/**
 * Removes unmanaged tasks from the coat local and global lockfiles.
 *
 * If a task is no longer specified by one of the extended templates of this
 * project, the task result should be removed to clean up the lockfiles.
 *
 * @param globalTasks Global tasks that are part of the current coat project
 * @param localTasks Local tasks that are part of the current coat project
 * @param context The context of the current coat project
 */
export async function removeUnamangedTasksFromLockfiles(
  globalTasks: CoatManifestTaskStrict[],
  localTasks: CoatManifestTaskStrict[],
  context: CoatContext
): Promise<CoatContext> {
  const newGlobalLockfile = stripTasks(globalTasks, context.coatGlobalLockfile);
  const newLocalLockfile = stripTasks(localTasks, context.coatLocalLockfile);

  const promises: Promise<void>[] = [];

  // Only write lockfiles if they have changed
  if (!isEqual(newGlobalLockfile, context.coatGlobalLockfile)) {
    promises.push(writeGlobalLockfile(newGlobalLockfile, context));
  }
  if (!isEqual(newLocalLockfile, context.coatLocalLockfile)) {
    promises.push(writeLocalLockfile(newLocalLockfile, context));
  }

  await Promise.all(promises);

  return produce(context, (draft) => {
    draft.coatGlobalLockfile = newGlobalLockfile;
    draft.coatLocalLockfile = newLocalLockfile;
  });
}
