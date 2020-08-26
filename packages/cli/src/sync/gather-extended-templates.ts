import path from "path";
import flattenDeep from "lodash/flattenDeep";
import resolveFrom from "resolve-from";
import importFrom from "import-from";
import { CoatManifestStrict } from "../types/coat-manifest";
import { CoatTemplate } from "../types/coat-template";
import { CoatContext } from "../types/coat-context";
import { getStrictCoatManifest } from "../util/get-strict-coat-manifest";

type NestedManifests = Array<NestedManifests | CoatManifestStrict>;

function getTemplates(
  cwd: string,
  context: CoatContext,
  template: string
): NestedManifests {
  // Resolve the directory of the current template to
  // use it as the cwd for child templates.
  //
  // Especially in workspaces node_modules might be deduped
  // or child templates might live in the node_modules folder
  // of the template itself
  const templateDir = path.dirname(resolveFrom(cwd, template));

  // Import the current template
  // TODO: See #15
  // Better error message when template can't be imported
  // with a hint to install node_modules
  const templateManifestRaw = importFrom(cwd, template) as CoatTemplate;

  let resolvedTemplate: CoatManifestStrict;
  if (typeof templateManifestRaw === "function") {
    resolvedTemplate = getStrictCoatManifest(templateManifestRaw(context));
  } else {
    resolvedTemplate = getStrictCoatManifest(templateManifestRaw);
  }

  return [
    ...resolvedTemplate.extends.map((childTemplate) =>
      getTemplates(templateDir, context, childTemplate)
    ),
    resolvedTemplate,
  ];
}

/**
 * Retrieves and imports all templates that are extended by a coat project.
 *
 * If a single child template is used by multiple templates, it will be not be
 * deduped in order to preserve any logic that depends on the child template being
 * available before the parent template is evaluated.
 *
 * @param context The coat project context
 */
export function gatherExtendedTemplates(
  context: CoatContext
): CoatManifestStrict[] {
  const results = context.coatManifest.extends.map((template) =>
    getTemplates(context.cwd, context, template)
  );

  // Node.js 10 compatibility
  // Use results.flat(Infinity) once Node 10 is no longer supported
  return flattenDeep(results);
}
