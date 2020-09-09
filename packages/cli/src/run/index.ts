import concurrently from "concurrently";

/**
 * Runs the provided script patterns in parallel
 * from the current process working directory.
 *
 * Script patterns refer to script names in the working directory's
 * package.json file.
 *
 * Patterns can include wildcards, example:
 * package.json
 * {
 *   "scripts": {
 *     "build:tsc": "tsc",
 *     "build:babel": "babel"
 *   }
 * }
 * Using "build:*" as a script pattern will run both the
 * build:tsc and build:babel scripts in parallel.
 *
 * TODO: See #40
 * Allow specifying the cwd when calling run
 *
 * @param scriptPatterns The script patterns that will be evaluated and run
 */
export async function run(scriptPatterns: string[]): Promise<void> {
  // Prefix script patterns with npm: to let concurrently
  // know that it should run scripts from package.json
  const npmScriptPatterns = scriptPatterns.map((pattern) => `npm:${pattern}`);

  // TODO: See #41
  // Customize concurrently to prettify the script outputs and
  // make it possible to have priority outputs for certain scripts,
  // e.g. having a server watching script output take priority over
  // other background watch tasks
  await concurrently(npmScriptPatterns, {
    killOthers: ["failure"],
  });
}
