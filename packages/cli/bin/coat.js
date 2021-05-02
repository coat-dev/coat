#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
//
// The bin file for the @coat/cli package is not transpiled,
// since npm does not correctly symlink the bin file
// if it is transpiled during the bootstrapping process
//
// While this code is not covered by unit tests
// and code coverage, e2e tests
// in /tests will run this code since they run
// node with this file as the main module
//
const importLocal = require("import-local");

// Run local version of coat if installed in a project
if (!importLocal(__filename)) {
  const { createProgram } = require("../build/bin/cli");

  createProgram()
    .parseAsync(process.argv)
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
