import mergeWith from "lodash/mergeWith";
import uniqWith from "lodash/uniqWith";
import isEqual from "lodash/isEqual";
import jsonStableStringify from "json-stable-stringify";
import importFrom from "import-from";
import prettierFromCoat from "prettier";
import { JsonObject } from "type-fest";
import { FileTypeFunctions } from ".";
import { CoatContext } from "../types/coat-context";

function merge(
  source: JsonObject | null | undefined,
  target: JsonObject
): JsonObject | null {
  return mergeWith({}, source ?? {}, target, (innerTarget, innerSource) => {
    // Concatenate arrays rather than overwriting them
    if (Array.isArray(innerTarget) && Array.isArray(innerSource)) {
      const arrayResult = innerTarget.concat(innerSource);
      return uniqWith(arrayResult, isEqual);
    }
  });
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
  //
  // Use whether local prettier version if it exists
  let prettier = prettierFromCoat;
  if (context) {
    const prettierLocal = importFrom.silent(context.cwd, "prettier") as
      | typeof prettierFromCoat
      | undefined;
    if (prettierLocal) {
      prettier = prettierLocal;
    }
  }

  return prettier.format(sortedContent, {
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
