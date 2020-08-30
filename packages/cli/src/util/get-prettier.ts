import prettierFromCoat from "prettier";
import importFrom from "import-from";
import { CoatContext } from "../types/coat-context";

/**
 * Returns the prettier module from either coat's
 * dependencies or the local prettier version of
 * the current coat context if prettier is available.
 *
 * @param context The current coat context if available
 */
export function getPrettier(
  context: CoatContext | undefined
): typeof prettierFromCoat {
  let prettier = prettierFromCoat;
  if (context) {
    const prettierLocal = importFrom.silent(context.cwd, "prettier") as
      | typeof prettierFromCoat
      | undefined;
    if (prettierLocal) {
      prettier = prettierLocal;
    }
  }
  return prettier;
}
