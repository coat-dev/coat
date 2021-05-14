import { CoatContext } from "../types/coat-context";
import {
  CoatManifestTaskStrict,
  CoatTaskType,
} from "../types/coat-manifest-tasks";

/**
 * Filters and returns only tasks that should be run.
 *
 * Tasks can have a "shouldRun" function that will be called with
 * the context and previous task results if they are available.
 *
 * If tasks don't have a custom shouldRun function, they will only be run
 * if they haven't been run before.
 *
 * @param allTasks All tasks that should be checked whether they should be run
 * @param context The context of the current coat project
 * @param force Whether all tasks should run regardless of individual shouldRun results
 */
export async function getTasksToRun(
  allTasks: CoatManifestTaskStrict[],
  context: CoatContext,
  force: boolean
): Promise<CoatManifestTaskStrict[]> {
  if (force) {
    return allTasks;
  }

  // Determine which tasks should be run
  const allTasksUnfiltered = await Promise.all(
    allTasks.map(async (task) => {
      const previousTaskResults = (
        task.type === CoatTaskType.Global
          ? context.coatGlobalLockfile.setup
          : context.coatLocalLockfile.setup
      )[task.id];

      let shouldRun: boolean;
      if (task.shouldRun) {
        // Task has a custom shouldRun function,
        // call it with the previous result to determine
        // whether it should be run
        shouldRun = await task.shouldRun({
          context,
          previousResults: {
            global: context.coatGlobalLockfile.setup,
            local: context.coatLocalLockfile.setup,
          },
        });
      } else {
        // Task has no custom shouldRun function, it should be
        // run if there is no saved result for this task
        shouldRun = !previousTaskResults;
      }

      return shouldRun ? task : null;
    })
  );

  // Filter out null values
  const tasksToRun = allTasksUnfiltered.filter(
    (task): task is CoatManifestTaskStrict => !!task
  );

  return tasksToRun;
}
