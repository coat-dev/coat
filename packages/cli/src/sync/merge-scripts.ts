import flatten from "lodash/flatten";
import groupBy from "lodash/groupBy";
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
): Record<string, string> {
  // Group scripts by scriptName
  const groupedScripts = groupBy(flatten(scripts), "scriptName");

  return Object.entries(groupedScripts).reduce<Record<string, string>>(
    (accumulator, [scriptName, scripts]) => {
      if (scripts.length === 1) {
        accumulator[scriptName] = scripts[0].run;
      } else {
        // Create sub-scripts which will be run via coat run
        const scriptIdPrefix = `${scriptName}-`;
        const scriptNamePrefix = `${scriptName}:`;
        scripts.forEach((script) => {
          let scriptNameToUse = scriptNamePrefix;
          if (script.id.startsWith(scriptIdPrefix)) {
            scriptNameToUse += script.id.substr(scriptIdPrefix.length);
          } else {
            scriptNameToUse += script.id;
          }
          accumulator[scriptNameToUse] = script.run;
        });
        // TODO: See #9
        // Run with npm-run-all for now, switch to coat run
        // once #9 is done
        accumulator[scriptName] = `run-p ${scriptName}:*`;
      }
      return accumulator;
      /* eslint-enable no-param-reassign */
    },
    {}
  );
}
