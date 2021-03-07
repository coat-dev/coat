#!/usr/bin/env node
// The bin file for the @coat/cli package is not transpiled,
// since lerna does not correctly symlink the bin file
// if it is transpiled during the bootstrapping process
//
// While this code is not covered by unit tests
// and code coverage, e2e tests
// in /tests will run this code since they run
// node with this file as the main module
//
// TODO: See #14
// Run local version of coat if installed in a project

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createProgram } = require("../build/bin/cli");

createProgram()
  .parseAsync(process.argv)
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
