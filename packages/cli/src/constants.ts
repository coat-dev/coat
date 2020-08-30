export const PACKAGE_JSON_FILENAME = "package.json";

// package.json is imported with require and not an import
// statement since using import would lead to a different folder
// structure for the TypeScript declaration file outputs.
// eslint-disable-next-line @typescript-eslint/no-var-requires
export const COAT_CLI_VERSION = require(`../${PACKAGE_JSON_FILENAME}`).version;

export const COAT_MANIFEST_FILENAME = "coat.json";

export const COAT_LOCKFILE_FILENAME = "coat.lock";
export const COAT_LOCKFILE_VERSION = 1;
