import { CoatContext } from "../types/coat-context";
import { CoatManifestStrict } from "../types/coat-manifest";
import { gatherExtendedTemplates } from "./gather-extended-templates";

/**
 * Retrieves all extended templates by the current project and adds
 * the current coat manifest file as the last overriding template.
 *
 * @param context The context of the current coat project
 */
export function getAllTemplates(context: CoatContext): CoatManifestStrict[] {
  const extendedTemplates = gatherExtendedTemplates(context);
  // Include the current coat manifest as the final template that should
  // be applied.
  return [...extendedTemplates, context.coatManifest];
}
