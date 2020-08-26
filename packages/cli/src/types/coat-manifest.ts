import { CoatManifestFile } from "./coat-manifest-file";
import { CoatManifestScript } from "./coat-manifest-script";

export interface CoatManifest {
  name: string;
  extends?: string | string[];
  dependencies?: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
  };
  files?: CoatManifestFile[];
  scripts?: CoatManifestScript[];
}

export interface CoatManifestStrict extends CoatManifest {
  extends: string[];
  files: CoatManifestFile[];
  scripts: CoatManifestScript[];
  dependencies: Exclude<CoatManifest["dependencies"], undefined>;
}
