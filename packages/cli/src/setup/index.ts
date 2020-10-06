import { CoatContext } from "../types/coat-context";
import { getContext } from "../util/get-context";
import { getAllTemplates } from "../util/get-all-templates";
import { gatherAllTasks } from "./gather-all-tasks";
import { updateLockfiles } from "../lockfiles/update-lockfiles";
import { getTasksToRun } from "./get-tasks-to-run";
import { CoatTaskType } from "../types/coat-manifest-tasks";
import { removeUnmanagedTasksFromLockfiles } from "./remove-unmanaged-tasks-from-lockfile";

/**
 * Gathers and runs all tasks of a coat project.
 *
 * When running setup with the force = true option, all tasks will be
 * run regardless of whether they have been run before.
 *
 * @param cwd The working directory of the current coat project
 * @param force Whether to run tasks although they have been run before (e.g. when running the `coat setup` command directly)
 */
export async function setup(cwd: string, force: boolean): Promise<CoatContext> {
  // Get context from cwd
  let context = await getContext(cwd);

  // Gather all extended templates
  const allTemplates = getAllTemplates(context);
  const allTasks = gatherAllTasks(allTemplates);

  // TODO: See #38
  // Let user interactively select which tasks should be run
  const tasksToRun = await getTasksToRun(allTasks, context, force);

  // Run tasks sequentially to provide earlier task results
  // to following tasks
  for (const task of tasksToRun) {
    const taskResult = await task.run({
      context,
      previousResults: {
        global: context.coatGlobalLockfile.setup,
        local: context.coatLocalLockfile.setup,
      },
    });

    const updateLockfileOptions: Parameters<typeof updateLockfiles>[0] = {
      context,
    };
    const partialLockfileUpdate = {
      setup: {
        [task.id]: taskResult || {},
      },
    };
    switch (task.type) {
      case CoatTaskType.Global:
        updateLockfileOptions.updatedGlobalLockfile = partialLockfileUpdate;
        break;
      case CoatTaskType.Local:
        updateLockfileOptions.updatedLocalLockfile = partialLockfileUpdate;
        break;
    }
    // Update the lockfile in between task runs
    // to save task results in case a following task
    // throws an error
    context = await updateLockfiles(updateLockfileOptions);
  }

  // Remove task results that are from tasks that are
  // no longer managed by coat
  context = await removeUnmanagedTasksFromLockfiles(
    allTasks.filter((task) => task.type === CoatTaskType.Global),
    allTasks.filter((task) => task.type === CoatTaskType.Local),
    context
  );

  return context;
}
