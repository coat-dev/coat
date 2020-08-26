import { CoatManifestStrict } from "./coat-manifest";
import { PackageJson } from "type-fest";

export interface CoatContext {
  cwd: string;
  coatManifest: CoatManifestStrict;
  packageJson: PackageJson;
}
