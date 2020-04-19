#!/usr/bin/env node
import program from "commander";

// package.json is imported with require and not an import
// statement since using import would lead to a different folder
// structure for the TypeScript declaration file outputs.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require("../../package.json");
program.version(version);

program.parseAsync(process.argv).catch((error) => {
  console.error(error);
  process.exit(1);
});
