import produce from "immer";
import { JsonObject } from "type-fest";
import {
  CoatGlobalLockfileStrict,
  CoatLocalLockfileStrict,
} from "../types/coat-lockfiles";
import { CoatManifestTaskStrict } from "../types/coat-manifest-tasks";

/**
 * Removes unmanaged tasks from a coat lockfile.
 *
 * If a task is no longer specified by one of the extended templates of this
 * project, the task result should be removed to clean up the lockfile.
 *
 * @param lockfile A local or global coat lockfile
 * @param tasks Tasks that are part of the current coat project
 */
export function removeUnmanagedTasksFromLockfile<
  CoatLockfileType extends CoatLocalLockfileStrict | CoatGlobalLockfileStrict
>(
  lockfile: CoatLockfileType,
  tasks: CoatManifestTaskStrict[]
): CoatLockfileType {
  const taskIds = new Set(tasks.map((task) => task.id));

  return produce(lockfile, (draft: CoatLockfileType) => {
    draft.setup = Object.entries(draft.setup).reduce<
      Record<string, JsonObject>
    >((accumulator, [taskId, taskResult]) => {
      if (taskIds.has(taskId)) {
        accumulator[taskId] = taskResult;
      }
      return accumulator;
    }, {});
  });
}
