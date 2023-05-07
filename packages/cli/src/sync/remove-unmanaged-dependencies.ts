import { produce } from "immer";
import { difference } from "lodash";
import { CoatContext } from "../types/coat-context";
import { CoatManifestStrict } from "../types/coat-manifest";

export function removeUnmanagedDependencies(
  currentDependencies: CoatManifestStrict["dependencies"],
  templateDependencies: CoatManifestStrict["dependencies"],
  context: CoatContext
): CoatManifestStrict["dependencies"] {
  // Check which dependencies are tracked in the lockfile, but no longer
  // appear in the new template dependencies
  const dependenciesToRemove = difference(
    context.coatGlobalLockfile.dependencies.dependencies,
    Object.keys(templateDependencies.dependencies)
  );
  const devDependenciesToRemove = difference(
    context.coatGlobalLockfile.dependencies.devDependencies,
    Object.keys(templateDependencies.devDependencies)
  );
  const peerDependenciesToRemove = difference(
    context.coatGlobalLockfile.dependencies.peerDependencies,
    Object.keys(templateDependencies.peerDependencies)
  );
  const optionalDependenciesToRemove = difference(
    context.coatGlobalLockfile.dependencies.optionalDependencies,
    Object.keys(templateDependencies.optionalDependencies)
  );

  // Remove dependencies from the current dependency groups
  return produce(currentDependencies, (draft) => {
    dependenciesToRemove.forEach((dependencyName) => {
      delete draft.dependencies[dependencyName];
    });
    devDependenciesToRemove.forEach((dependencyName) => {
      delete draft.devDependencies[dependencyName];
    });
    peerDependenciesToRemove.forEach((dependencyName) => {
      delete draft.peerDependencies[dependencyName];
    });
    optionalDependenciesToRemove.forEach((dependencyName) => {
      delete draft.optionalDependencies[dependencyName];
    });
  });
}
