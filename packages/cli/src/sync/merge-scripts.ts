import flatten from "lodash/flatten";
import groupBy from "lodash/groupBy";
import { CoatManifestStrict } from "../types/coat-manifest";

export function mergeScripts(
  scripts: CoatManifestStrict["scripts"][]
): Record<string, string> {
  // Group scripts by scriptName
  const groupedScripts = groupBy(flatten(scripts), "scriptName");

  return Object.entries(groupedScripts).reduce<Record<string, string>>(
    (result, [scriptName, scripts]) => {
      if (scripts.length === 1) {
        result[scriptName] = scripts[0].run;
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
          result[scriptNameToUse] = script.run;
        });
        // TODO: See #9
        // Run with npm-run-all for now, switch to coat run
        // once #9 is done
        result[scriptName] = `run-p ${scriptName}:*`;
      }
      return result;
    },
    {}
  );
}
