export interface CoatManifestScript {
  id: string;
  // The resulting name of the script that is placed in package.json
  scriptName: string;
  run: string;
}
