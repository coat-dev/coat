import jsonStableStringify from "json-stable-stringify";
import yaml from "js-yaml";
import { JsonObject } from "type-fest";
import { jsonFileFunctions } from "./json";
import { FileTypeFunctions } from ".";
import { CoatContext } from "../types/coat-context";
import { getPrettier } from "../util/get-prettier";

function polish(
  source: JsonObject,
  filePath: string,
  context: CoatContext
): string {
  // Sort properties
  const sortedJsonContent = jsonStableStringify(source);
  const sortedSource = JSON.parse(sortedJsonContent);
  const sortedContent = yaml.dump(sortedSource);

  const prettier = getPrettier(context);

  // Check whether prettier can already infer the parser
  // from the current file path
  const fileInfo = prettier.getFileInfo.sync(filePath);
  let filePathForPrettier = filePath;
  if (!fileInfo.inferredParser) {
    // Add .yaml extension since prettier was not
    // able to infer the parser automatically
    filePathForPrettier = `${filePath}.yaml`;
  }

  // Format with prettier
  return prettier.format(sortedContent, {
    filepath: filePathForPrettier,
  });
}

export const yamlFileFunctions: FileTypeFunctions<JsonObject> = {
  // Uses the same merge mechanism as JSON files
  merge: jsonFileFunctions.merge,
  polish,
};
