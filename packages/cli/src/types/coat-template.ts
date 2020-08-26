import { CoatContext } from "./coat-context";
import { CoatManifest } from "./coat-manifest";

export type CoatTemplate =
  | CoatManifest
  | ((coatContext: CoatContext) => CoatManifest);
