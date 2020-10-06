import { CoatContext } from "./coat-context";
import { CoatManifest } from "./coat-manifest";

export type CoatTemplate<
  TemplateConfig extends Record<string, unknown> = Record<string, unknown>
> =
  | CoatManifest
  | ((options: {
      config: TemplateConfig;
      coatContext: CoatContext;
    }) => CoatManifest);
