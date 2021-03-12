import { CoatContext } from "../types/coat-context";
import { getContext } from "../util/get-context";
import { getAllTemplates } from "../util/get-all-templates";
import { gatherAllTasks } from "./gather-all-tasks";
import {
  updateGlobalLockfile,
  updateLocalLockfile,
} from "../lockfiles/update-lockfile";
import { getTasksToRun } from "./get-tasks-to-run";
import { CoatTaskType } from "../types/coat-manifest-tasks";
import { removeUnmanagedTasksFromLockfile } from "./remove-unmanaged-tasks-from-lockfile";
import {
  writeGlobalLockfile,
  writeLocalLockfile,
} from "../lockfiles/write-lockfiles";
import { isEqual } from "lodash";
import produce from "immer";
import chalk from "chalk";

/**
 * Gathers and runs all tasks of a coat project.
 *
 * When running setup with the force = true option, all tasks will be
 * run regardless of whether they have been run before.
 *
 * @param options.cwd The working directory of the current coat project
 * @param options.check Whether a dry-run should be performed that checks
 * and exits if the coat project is out of sync and has pending global tasks that need to be run
 * @param options.force Whether to run tasks although they have been run before (e.g. when running the `coat setup` command directly)
 */
export async function setup({
  cwd,
  check,
  force,
}: {
  cwd: string;
  check?: boolean;
  force?: boolean;
}): Promise<CoatContext> {
  const checkFlag = !!check;
  const forceFlag = !!force;
  // Get context from cwd
  let context = await getContext(cwd);

  // Gather all extended templates
  const allTemplates = getAllTemplates(context);
  const allTasks = gatherAllTasks(allTemplates);

  // TODO: See #38
  // Let user interactively select which tasks should be run
  const tasksToRun = await getTasksToRun(allTasks, context, forceFlag);

  // --check flag
  if (checkFlag) {
    // If any global task has to be run, the coat project is out of sync
    const globalTasksToRun = tasksToRun.filter(
      (task) => task.type === CoatTaskType.Global
    );
    if (globalTasksToRun.length) {
      const messages = [
        "",
        `The ${chalk.cyan("coat")} project is not in sync.`,
        "There are global tasks pending that need to be run to setup this coat project.",
        "",
        `Run ${chalk.cyan("coat sync")} to bring the project back in sync.`,
      ];
      console.error(messages.join("\n"));
      process.exit(1);
    }
  } else {
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

      const partialLockfileUpdate = {
        setup: {
          [task.id]: taskResult || {},
        },
      };

      // Update the lockfile in between task runs
      // to save task results in case a following task
      // throws an error
      switch (task.type) {
        case CoatTaskType.Global: {
          const newGlobalLockfile = updateGlobalLockfile(
            context.coatGlobalLockfile,
            partialLockfileUpdate
          );
          context = produce(context, (draft) => {
            draft.coatGlobalLockfile = newGlobalLockfile;
          });
          await writeGlobalLockfile(newGlobalLockfile, context);
          break;
        }
        case CoatTaskType.Local: {
          const newLocalLockfile = updateLocalLockfile(
            context.coatLocalLockfile,
            partialLockfileUpdate
          );
          context = produce(context, (draft) => {
            draft.coatLocalLockfile = newLocalLockfile;
          });
          await writeLocalLockfile(newLocalLockfile, context);
          break;
        }
        // The default case is only required to let TypeScript throw
        // compiler errors if a new task type is added
        /* istanbul ignore next */
        default: {
          const unhandledTask: never = task;
          throw new Error(`Unhandled task type for task: ${unhandledTask}`);
        }
      }
    }
  }

  // Remove task results that are from tasks that are
  // no longer managed by coat
  //
  // global lockfile
  const newGlobalLockfile = removeUnmanagedTasksFromLockfile(
    context.coatGlobalLockfile,
    allTasks.filter((task) => task.type === CoatTaskType.Global)
  );
  if (!isEqual(context.coatGlobalLockfile, newGlobalLockfile)) {
    //
    // --check flag
    if (checkFlag) {
      // If the global lockfile needs to be updated,
      // the coat project is out of sync
      const messages = [
        "",
        `The ${chalk.cyan("coat")} project is not in sync.`,
        `The global lockfile (${chalk.green(
          "coat.lock"
        )}) needs to be updated.`,
        "",
        `Run ${chalk.cyan("coat sync")} to bring the project back in sync.`,
      ];
      console.error(messages.join("\n"));
      process.exit(1);
    }

    context = produce(context, (draft) => {
      draft.coatGlobalLockfile = newGlobalLockfile;
    });
    await writeGlobalLockfile(newGlobalLockfile, context);
  }

  // Local lockfile should only be updated if the setup method is not invoked with --check
  if (!checkFlag) {
    // local lockfile
    const newLocalLockfile = removeUnmanagedTasksFromLockfile(
      context.coatLocalLockfile,
      allTasks.filter((task) => task.type === CoatTaskType.Local)
    );
    if (!isEqual(context.coatLocalLockfile, newLocalLockfile)) {
      context = produce(context, (draft) => {
        draft.coatLocalLockfile = newLocalLockfile;
      });
      await writeLocalLockfile(newLocalLockfile, context);
    }
  }

  return context;
}
