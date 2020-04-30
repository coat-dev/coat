#!/usr/bin/env node
import { Command, CommandConstructor } from "commander";
import { create } from "../create";
import { COAT_CLI_VERSION } from "../constants";

export function createProgram(): InstanceType<CommandConstructor> {
  const program = new Command("coat");
  program.version(COAT_CLI_VERSION).passCommandToAction(false);

  program
    .command("create <template> [projectName] [dir]")
    .description("Create a new project based on the coat template.")
    .helpOption(
      undefined,
      '\n\nArguments:\ntemplate (required): The name of coat template from the npm registry (e.g. "@coat/template-ts-package")\n\nprojectName (optional): The name of your new project. You will be prompted if no name is provided. The name must be a valid package name inside package.json.\n\ndir (optional): The directory where coat should create the project. The project name is used by default. If the project name contains a slash only the trailing part will be used.'
    )
    .action(create);

  return program;
}

// The following condition is ignored when collecting
// code coverage, since the cli is started in a different
// way for unit tests.
// Integration tests in /tests will run this code
// since they spawn a new process which requires
// this file as the main module
/* istanbul ignore next */
if (require.main === module) {
  createProgram()
    .parseAsync(process.argv)
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
