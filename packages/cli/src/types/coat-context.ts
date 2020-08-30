import { CoatManifestStrict } from "./coat-manifest";
import { PackageJson } from "type-fest";
import { CoatLockfile } from "./coat-lockfile";

export interface CoatContext {
  cwd: string;
  coatManifest: CoatManifestStrict;
  coatLockfile: CoatLockfile | undefined;
  packageJson: PackageJson;
}
