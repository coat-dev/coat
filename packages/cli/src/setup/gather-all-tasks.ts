import {
  CoatManifestTaskStrict,
  CoatTaskType,
  CoatGlobalTaskStrict,
  CoatGlobalTask,
  CoatLocalTask,
  CoatLocalTaskStrict,
} from "../types/coat-manifest-tasks";
import { CoatManifestStrict } from "../types/coat-manifest";

function mergeTasks(tasks: CoatManifestTaskStrict[]): CoatManifestTaskStrict[] {
  // If multiple tasks share the same id, the latest task
  // to use the id should replace the earliest task in the array
  return tasks.reduce<{
    result: CoatManifestTaskStrict[];
    indexMap: Record<string, number>;
  }>(
    (accumulator, task) => {
      const savedTaskIndex = accumulator.indexMap[task.id];
      if (typeof savedTaskIndex === "undefined") {
        // Task does not exist yet, save it in the resulting array
        accumulator.indexMap[task.id] = accumulator.result.push(task) - 1;
      } else {
        // Replace earlier task with current task version
        accumulator.result[savedTaskIndex] = task;
      }
      return accumulator;
    },
    { result: [], indexMap: {} }
  ).result;
}

/**
 * Gathers all global and local tasks from the current coat project and returns
 * them sorted with global tasks before local tasks.
 *
 * Tasks with the same id and global/local scope will be merged, in that a
 * task replace its earlier version if it has the same id and takes its place
 * in the resulting tasks array.
 *
 * @param allTemplates All extended templates from the current coat project
 */
export function gatherAllTasks(
  allTemplates: CoatManifestStrict[]
): CoatManifestTaskStrict[] {
  // Gather all tasks from the extended templates
  const { globalTasks, localTasks } = allTemplates.reduce<{
    globalTasks: CoatGlobalTaskStrict[];
    localTasks: CoatLocalTaskStrict[];
  }>(
    (result, template) => {
      result.globalTasks.push(
        ...template.setup
          .filter((task): task is CoatGlobalTask => !task.local)
          // The local property is destructured to remove it from the
          // resulting task
          //
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .map(({ local, ...task }) => ({
            ...task,
            type: CoatTaskType.Global as const,
          }))
      );
      result.localTasks.push(
        ...template.setup
          .filter((task): task is CoatLocalTask => !!task.local)
          // The local property is destructured to remove it from the
          // resulting task
          //
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .map(({ local, ...task }) => ({
            ...task,
            type: CoatTaskType.Local as const,
          }))
      );
      return result;
    },
    { globalTasks: [], localTasks: [] }
  );

  // Merge tasks with the same id
  const mergedGlobalTasks = mergeTasks(globalTasks);
  const mergedLocalTasks = mergeTasks(localTasks);

  return [...mergedGlobalTasks, ...mergedLocalTasks];
}
