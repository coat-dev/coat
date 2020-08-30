export interface CoatManifestScript {
  /**
   * The id of a script
   *
   * When multiple scripts share the same scriptName,
   * the id will be suffixed to the resulting merged script.
   */
  id: string;
  /**
   * The resulting name of the script that is placed in package.json
   */
  scriptName: string;
  /**
   * The shell command that will be executed when running the script
   */
  run: string;
}
