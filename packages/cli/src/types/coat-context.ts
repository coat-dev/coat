import { CoatManifestStrict } from "./coat-manifest";
import { PackageJson } from "type-fest";
import {
  CoatGlobalLockfileStrict,
  CoatLocalLockfileStrict,
} from "./coat-lockfiles";

/**
 * The context of a coat project
 */
export interface CoatContext {
  /**
   * The root directory of the coat project
   */
  cwd: string;
  /**
   * The root manifest file
   */
  coatManifest: CoatManifestStrict;
  /**
   * The global lockfile (project-dir/coat.lock)
   */
  coatGlobalLockfile: CoatGlobalLockfileStrict;
  /**
   * The local lockfile (project-dir/.coat/coat.lock)
   */
  coatLocalLockfile: CoatLocalLockfileStrict;
  /**
   * The package json content in the root project directory
   * or undefined if it does not exist
   */
  packageJson: PackageJson | undefined;
}
