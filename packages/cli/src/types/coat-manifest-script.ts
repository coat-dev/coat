export interface CoatManifestScript {
  /**
   * The id of a script
   *
   * When multiple scripts share the same scriptName,
   * the id will be suffixed to the resulting merged script.
   *
   * If the id starts with the scriptName followed by a dash, it will
   * be stripped from the resulting parallel script, for example:
   * The following two scripts
   *
   * { id: "lint-eslint", scriptName: "lint" }
   * { id: "lint-prettier", scriptName: "lint" }
   *
   * will be merged into the following scripts:
   *
   * {
   *   "lint": "coat run lint:*",
   *   "lint:eslint": "..."
   *   "lint:prettier": "...",
   * }
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
