import mergeWith from "lodash/mergeWith";
import jsonStableStringify from "json-stable-stringify";
import { JsonifiableObject } from "../types/jsonifiable-object";
import { FileTypeFunctions } from ".";
import { CoatContext } from "../types/coat-context";
import { getPrettier } from "../util/get-prettier";

function mergeWithArrayReplacement(source: unknown, target: unknown): unknown {
  // Replace arrays rather than merging them
  if (Array.isArray(target) && Array.isArray(source)) {
    return target;
  }
}

function merge(
  source: JsonifiableObject | null | undefined,
  target: JsonifiableObject
): JsonifiableObject | null {
  // Default object merge behavior is covered by lodash's
  // merge function. Properties will be merged deeply,
  // newer arrays will replace existing ones
  return mergeWith({}, source ?? {}, target, mergeWithArrayReplacement);
}

export function polish(
  source: JsonifiableObject,
  filePath: string,
  context?: CoatContext
): string {
  // Sort json properties
  //
  // The spaces argument of 1 is added to ensure that prettier does not
  // output the whole object one a single line
  let sortedContent = jsonStableStringify(source, { space: 1 });

  // Always put name and version on top for json files
  if (
    typeof source.name !== "undefined" ||
    typeof source.version !== "undefined"
  ) {
    const { name, version, ...props } = JSON.parse(sortedContent);
    const jsonContent = {
      name,
      version,
      ...props,
    };
    // The spaces argument of 1 is added to ensure that prettier does not
    // output the whole object one a single line
    sortedContent = JSON.stringify(jsonContent, null, 1);
  }

  const prettier = getPrettier(context);

  // Check whether prettier can already infer the parser
  // from the current file path
  const fileInfo = prettier.getFileInfo.sync(filePath);
  let filePathForPrettier = filePath;
  if (!fileInfo.inferredParser) {
    // Add .json extension since prettier was not
    // able to infer the parser automatically
    filePathForPrettier = `${filePath}.json`;
  }

  // Format with prettier
  return prettier.format(sortedContent, {
    filepath: filePathForPrettier,
  });
}

export const jsonFileFunctions: FileTypeFunctions<JsonifiableObject> = {
  merge,
  polish,
};
