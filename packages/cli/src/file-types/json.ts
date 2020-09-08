import lodashMerge from "lodash/merge";
import jsonStableStringify from "json-stable-stringify";
import { JsonObject } from "type-fest";
import { FileTypeFunctions } from ".";
import { CoatContext } from "../types/coat-context";
import { getPrettier } from "../util/get-prettier";

function merge(
  source: JsonObject | null | undefined,
  target: JsonObject
): JsonObject | null {
  // Default object merge behavior is covered by lodash's
  // merge function. Properties will be merged deeply,
  // arrays will be merged as well, e.g.:
  // a1 = [1, 2, 3] ; a2 = [undefined, 4, 3, 5]
  // will result in:
  // [1, 4, 3, 5]
  return lodashMerge({}, source ?? {}, target);
}

export function polish(
  source: JsonObject,
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

  // Format with prettier
  return getPrettier(context).format(sortedContent, {
    // Add .json extension to infer json parser in prettier
    // since files might have different extensions
    // (e.g. .babelrc, file.config, etc.)
    filepath: `${filePath}.json`,
  });
}

export const jsonFileFunctions: FileTypeFunctions<JsonObject> = {
  merge,
  polish,
};
