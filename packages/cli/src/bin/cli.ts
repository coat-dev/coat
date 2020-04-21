#!/usr/bin/env node
import program from "commander";
import { create } from "../create";

// package.json is imported with require and not an import
// statement since using import would lead to a different folder
// structure for the TypeScript declaration file outputs.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require("../../package.json");
program.version(version);

program
  .command("create <template> [projectName] [dir]")
  .description("Create a new project based on the coat template.")
  .helpOption(
    undefined,
    '\n\nArguments:\ntemplate (required): The name of coat template from the npm registry (e.g. "@coat/template-ts-package")\n\nprojectName (optional): The name of your new project. You will be prompted if no name is provided. The name must be a valid package name inside package.json.\n\ndir (optional): The directory where coat should create the project. The project name is used by default. If the project name contains a slash only the trailing part will be used.'
  )
  .action(create);

program.parseAsync(process.argv).catch((error) => {
  console.error(error);
  process.exit(1);
});
