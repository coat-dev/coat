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
  templateEntry: CoatManifestStrict["extends"][0]
): NestedManifests {
  let template: string;
  let templateConfig: Record<string, unknown>;

  // extends entries can either be plain strings or
  // tuples in the form of:
  // [templateName, templateConfig]
  if (Array.isArray(templateEntry)) {
    [template, templateConfig] = templateEntry;
  } else {
    template = templateEntry;
    // Default config is an empty object
    templateConfig = {};
  }

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
  const templateManifestRawModule = importFrom(cwd, template);

  // Check whether the template exported its manifest or manifest function
  // as a default export or directly using module.exports
  let templateManifestRaw: CoatTemplate;
  if (
    typeof templateManifestRawModule === "object" &&
    templateManifestRawModule !== null &&
    "__esModule" in templateManifestRawModule &&
    "default" in templateManifestRawModule
  ) {
    templateManifestRaw = (templateManifestRawModule as {
      default: CoatTemplate;
    }).default;
  } else {
    templateManifestRaw = templateManifestRawModule as CoatTemplate;
  }

  let resolvedTemplate: CoatManifestStrict;
  if (typeof templateManifestRaw === "function") {
    resolvedTemplate = getStrictCoatManifest(
      templateManifestRaw({ coatContext: context, config: templateConfig })
    );
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
 * @param context The context of the current coat project
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
