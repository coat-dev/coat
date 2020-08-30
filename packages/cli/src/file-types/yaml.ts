import jsonStableStringify from "json-stable-stringify";
import yaml from "js-yaml";
import { JsonObject } from "type-fest";
import { merge } from "./json";
import { FileTypeFunctions } from ".";
import { CoatContext } from "../types/coat-context";
import { getPrettier } from "../util/get-prettier";

function polish(
  source: JsonObject,
  filePath: string,
  context?: CoatContext
): string {
  // Sort properties
  const sortedJsonContent = jsonStableStringify(source);
  const sortedSource = JSON.parse(sortedJsonContent);
  const sortedContent = yaml.safeDump(sortedSource);

  // Format with prettier
  return getPrettier(context).format(sortedContent, {
    // Add .yaml extension to infer json parser in prettier
    // since files might have different extensions
    // (e.g. .graphqlconfig, file.config, etc.)
    filepath: `${filePath}.yaml`,
  });
}

export const yamlFileFunctions: FileTypeFunctions<JsonObject> = {
  // Uses the same merge mechanism as JSON files
  merge,
  polish,
};
