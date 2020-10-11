import flatten from "lodash/flatten";
import groupBy from "lodash/groupBy";
import uniqBy from "lodash/uniqBy";
import { CoatManifestStrict } from "../types/coat-manifest";

/**
 * Merges all scripts of a coat project.
 *
 * Scripts are shell commands that are placed as npm scripts in
 * the package.json file of a coat project.
 *
 * If multiple scripts share the same scriptName, they will
 * be placed to run in parallel.
 *
 * @param scripts All scripts that should be merged
 */
export function mergeScripts(
  scripts: CoatManifestStrict["scripts"][]
): {
  scripts: Record<string, string>;
  parallelScriptPrefixes: string[];
} {
  // Use the latest script entry for scripts that share the same id
  const uniqueScripts = uniqBy(flatten(scripts).reverse(), "id");

  // Group scripts by scriptName
  const groupedScripts = groupBy(uniqueScripts, "scriptName");

  return Object.entries(groupedScripts).reduce<{
    scripts: Record<string, string>;
    parallelScriptPrefixes: string[];
  }>(
    (accumulator, [scriptName, scripts]) => {
      if (scripts.length === 1) {
        accumulator.scripts[scriptName] = scripts[0].run;
      } else {
        // Create sub-scripts which will be run via coat run
        const scriptIdPrefix = `${scriptName}-`;
        const scriptNamePrefix = `${scriptName}:`;

        // Add scriptNamePrefix to parallelScriptPrefixes to be able to
        // later delete potentially existing scripts from
        // the current package.json file
        accumulator.parallelScriptPrefixes.push(scriptNamePrefix);

        scripts.forEach((script) => {
          let scriptNameToUse = scriptNamePrefix;
          if (script.id.startsWith(scriptIdPrefix)) {
            scriptNameToUse += script.id.substr(scriptIdPrefix.length);
          } else {
            scriptNameToUse += script.id;
          }
          accumulator.scripts[scriptNameToUse] = script.run;
        });

        // Merge the script by adding the coat run
        // command to run all scripts in parallel.
        accumulator.scripts[scriptName] = `coat run ${scriptName}:*`;
      }
      return accumulator;
      /* eslint-enable no-param-reassign */
    },
    {
      scripts: {},
      parallelScriptPrefixes: [],
    }
  );
}
