import { JsonObject } from "type-fest";
import { CoatContext } from "./coat-context";

interface CoatTaskRunOptions {
  previousResults: {
    global: { [taskId: string]: JsonObject };
    local: { [taskId: string]: JsonObject };
  };
  context: CoatContext;
}

interface CoatTask {
  /**
   * The id of a coat task
   *
   * The id is used when merging tasks and when
   * storing the results of a task's run function.
   */
  id: string;
  /**
   * The function that will be run when the task is executed.
   *
   * The run function can be asynchronous and should perform one-time
   * setup tasks that are required for coat to generate files and the project
   * to work as expected.
   *
   * It will be called with the task results from previous tasks or runs.
   */
  run: (options: CoatTaskRunOptions) => JsonObject | Promise<JsonObject>;
  /**
   * An optional function to determine whether a task should be run or not.
   *
   * Tasks are only run once, if they have never been run before. To customize
   * this behavior, the shouldRun function can return a boolean
   * (also asynchronously) to determine whether a task needs to be run again.
   *
   * The shouldRun function will be called with previous tasks or runs.
   */
  shouldRun?: (options: CoatTaskRunOptions) => boolean | Promise<boolean>;
  /**
   * Sets whether this task should be run per clone of the repository
   *
   * Local tasks might be useful when setting up environment and developer specific
   * configuration, like asking the user of which editor configuration files should
   * be generated. Global tasks (default) on the other hand are usually for
   * "once-per-project" tasks like creating a repository on GitHub or creating a
   * new AWS account.
   */
  local?: boolean;
}

export interface CoatGlobalTask extends CoatTask {
  local?: false;
}

export interface CoatLocalTask extends CoatTask {
  local: true;
  runOnCi?: boolean; // Defaults to false
}

export type CoatManifestTask = CoatGlobalTask | CoatLocalTask;

export enum CoatTaskType {
  Global = "GLOBAL",
  Local = "LOCAL",
}

interface CoatTaskStrict<Type extends CoatTaskType> {
  type: Type;
}
export type CoatGlobalTaskStrict = Omit<CoatGlobalTask, "local"> &
  CoatTaskStrict<CoatTaskType.Global>;
export type CoatLocalTaskStrict = Omit<CoatLocalTask, "local"> &
  CoatTaskStrict<CoatTaskType.Local>;
export type CoatManifestTaskStrict = CoatGlobalTaskStrict | CoatLocalTaskStrict;
