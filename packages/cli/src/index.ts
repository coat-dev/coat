// Export all relevant types
export type { CoatContext } from "./types/coat-context";
export type { CoatManifest } from "./types/coat-manifest";
export type { CoatTemplate } from "./types/coat-template";

export { CoatManifestFileType } from "./types/coat-manifest-file";
export type { CoatManifestFile } from "./types/coat-manifest-file";
export type { CoatManifestScript } from "./types/coat-manifest-script";
export type { CoatManifestTask } from "./types/coat-manifest-tasks";

// Export main command functions
export { create } from "./create";
export { run } from "./run";
export { setup } from "./setup";
export { sync } from "./sync";
