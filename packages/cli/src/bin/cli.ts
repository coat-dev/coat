#!/usr/bin/env node
import { Command, CommandConstructor } from "commander";
import { COAT_CLI_VERSION } from "../constants";
import { create } from "../create";
import { run } from "../run";
import { setup } from "../setup";
import { sync } from "../sync";

/**
 * Creates a command CLI program to run coat commands
 * from the cli or programmatically in tests
 */
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

  program
    .command("setup")
    .description("Runs all setup tasks of the current coat project")
    .helpOption(
      undefined,
      "\n\nGathers all setup tasks of the extended templates and runs them in sequential order."
    )
    .action(async () => {
      await setup(process.cwd(), true);
    });

  program
    .command("sync")
    .description("Generates all files of the current coat project.")
    .helpOption(
      undefined,
      '\n\nGathers all files of the extended templates, merges them and places them in the project directory.\n\nGenerated files can be extended by placing a file next to it with the "-custom.js" suffix and exporting a function that returns the customized content.'
    )
    .action(async () => {
      await sync(process.cwd());
    });

  program
    .command("run <scriptPattern> [otherScriptPatterns...]")
    .description("Runs one or multiple package.json scripts in parallel")
    .helpOption(
      undefined,
      "\n\nYou can run multiple scripts by specifying a wildcard, e.g. coat run build:* will run all scripts that are prefixed with build: inside the package.json scripts object."
    )
    .action(async (scriptPattern, otherScriptPatterns) => {
      await run([scriptPattern, ...otherScriptPatterns]);
    });

  return program;
}

// The following condition is ignored when collecting
// code coverage, since the cli is started in a different
// way for unit tests.
// Integration tests in /tests will run this code
// since they spawn a new process which requires
// this file as the main module
//
// TODO: See #14
// Run local version of coat if installed in a project
/* istanbul ignore next */
if (require.main === module) {
  createProgram()
    .parseAsync(process.argv)
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
