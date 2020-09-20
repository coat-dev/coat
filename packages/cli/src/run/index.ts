import { promises as fs } from "fs";
import path from "path";
import { PACKAGE_JSON_FILENAME } from "../constants";
import { PackageJson } from "type-fest";
import { runSingleScript } from "./run-single-script";
import { runMultipleScripts } from "./run-multiple-scripts";

/**
 * Runs the provided script patterns in parallel
 * from the specified working directory.
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
 * @param cwd The working directory of the current project
 * @param scriptPatterns The script patterns that will be evaluated and run
 */
export async function run(
  cwd: string,
  scriptPatterns: string[]
): Promise<void> {
  // Split patterns by script names and arguments that
  // will be forwarded to each script.
  //
  // All patterns that follow the first dash ("-")
  // will be forwarded as arguments.
  //
  // Example:
  // scriptPatterns: ["build:* test --watch files"]
  // scriptInputs: ["build:*", "test"]
  // args: ["--watch", "files"]
  const { scriptInputs, args } = scriptPatterns.reduce<{
    scriptInputs: string[];
    args: string[];
  }>(
    (accumulator, pattern) => {
      if (accumulator.args.length || pattern.startsWith("-")) {
        accumulator.args.push(pattern);
      } else {
        accumulator.scriptInputs.push(pattern);
      }
      return accumulator;
    },
    { scriptInputs: [], args: [] }
  );

  // It is possible that all provided patterns are arguments
  // without a single script name. In this case an error should
  // thrown, because no script will be run
  if (!scriptInputs.length) {
    throw new Error("No script pattern provided.");
  }

  // Get all script names from package.json
  const packageJsonRaw = await fs.readFile(
    path.join(cwd, PACKAGE_JSON_FILENAME),
    "utf8"
  );
  const packageJson: PackageJson = JSON.parse(packageJsonRaw);
  const packageJsonScriptNames = Object.keys(packageJson.scripts ?? {});
  const packageJsonScriptNamesSet = new Set(packageJsonScriptNames);

  const scriptsToRun = scriptInputs.reduce<string[]>(
    (accumulator, scriptPattern) => {
      // Script patterns can either be a simple script name
      // or multiple scripts using a wildcard (*).
      if (scriptPattern.includes("*")) {
        // run should use simplistic logic and match all scripts
        // that start with the part until the first '*' character.
        //
        // More sophisticated matching is not needed at this time
        // since the main use case is for scripts that are merged
        // by coat. There are other cli tools that can provide
        // more sophisticated behavior, e.g. concurrently.
        const scriptPatternPrefix = scriptPattern.split("*")[0];
        const scriptsForPattern = packageJsonScriptNames.filter((scriptName) =>
          scriptName.startsWith(scriptPatternPrefix)
        );
        if (!scriptsForPattern.length) {
          // Throw an error when a pattern yields no result to
          // prevent unintended behavior where a user expected a script
          // to be run but it did not match any scripts.
          throw new Error(
            `No scripts found in package.json for pattern: ${scriptPattern}`
          );
        }
        accumulator.push(...scriptsForPattern);
      } else {
        if (!packageJsonScriptNamesSet.has(scriptPattern)) {
          // Throw an error when a script name is not found to
          // prevent unintended behavior where a user expected a script
          // to be run but it did not match any scripts.
          throw new Error(
            `No script named "${scriptPattern}" found in package.json`
          );
        }
        accumulator.push(scriptPattern);
      }

      return accumulator;
    },
    []
  );

  if (scriptsToRun.length === 1) {
    // If the provided input resolves to a single
    // script, it should be called in a special
    // way to inherit the stdio and allow advanced
    // interaction patterns
    // e.g. using jest in watch mode
    await runSingleScript(cwd, scriptsToRun[0], args);
  } else {
    await runMultipleScripts(cwd, scriptsToRun, args);
  }
}
