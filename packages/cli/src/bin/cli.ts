import { Command, CommandConstructor } from "commander";
import { COAT_CLI_VERSION } from "../constants";
import { create } from "../create";
import { run } from "../run";
import { setup } from "../setup";
import { sync } from "../sync";
import { getCoatHeader } from "./get-coat-header";

/**
 * Creates a command CLI program to run coat commands
 * from the cli or programmatically in tests
 */
export function createProgram(): InstanceType<CommandConstructor> {
  const program = new Command("coat");
  program.version(COAT_CLI_VERSION).allowUnknownOption();

  program
    .command("create <template> [dir] [projectName]")
    .description("Create a new project based on the coat template.")
    .helpOption(
      undefined,
      '\n\nArguments:\ntemplate (required): The name of coat template from the npm registry (e.g. "@coat/template-ts-package")\n\ndir (optional): The directory where coat should create a project. Resolves to a relative path from the current working directory\n\nprojectName (optional): The name of your new project. Will use the trailing folder name of the project directory by default'
    )
    .action(async (template, directory, projectName) => {
      await create({ template, directory, projectName });
    });

  program
    .command("setup")
    .description("Runs all setup tasks of the current coat project")
    .helpOption(
      undefined,
      "\n\nGathers all setup tasks of the extended templates and runs them in sequential order."
    )
    .action(async () => {
      await setup({ cwd: process.cwd(), force: true });
    });

  program
    .command("sync")
    .description("Generates all files of the current coat project.")
    .option(
      "--check",
      "Checks whether the coat project is in sync or whether there are any pending global file operations. Useful on CI systems to determine whether coat sync needs to be run."
    )
    .helpOption(
      undefined,
      '\n\nGathers all files of the extended templates, merges them and places them in the project directory.\n\nGenerated files can be extended by placing a file next to it with the "-custom.js" suffix and exporting a function that returns the customized content.'
    )
    .action(async (options) => {
      await sync({ cwd: process.cwd(), check: !!options.check });
    });

  program
    .command("run <scriptPattern> [otherScriptPatterns...]")
    .description("Runs one or multiple package.json scripts in parallel")
    .allowUnknownOption()
    .helpOption(
      undefined,
      '\n\nYou can run multiple scripts by specifying a wildcard, e.g. coat run build:* will run all scripts that are prefixed with build: inside the package.json scripts object.\n\nAll arguments after the first dash ("-") will be passed to each script, e.g. "coat run build --watch" will call the build script with "--watch"'
    )
    .action(async (scriptPattern, otherScriptPatterns) => {
      try {
        await run({
          cwd: process.cwd(),
          scriptPatterns: [scriptPattern, ...otherScriptPatterns],
        });
      } catch (error) {
        // Exit immediately with the exitCode if a script has thrown an error
        if (error.exitCode) {
          process.exit(error.exitCode);
        }
        // Otherwise rethrow the error directly
        throw error;
      }
    });

  // This handler catches all commands which are not
  // declared above.
  // If coat is called without a built-in command,
  // it should be checked whether a script exists that
  // can be run as a shortcut instead.
  // Example:
  // "coat run <script>" -> "coat <script>"
  program.on("command:*", async (commands, options) => {
    try {
      await run({
        cwd: process.cwd(),
        scriptPatterns: [...commands, ...options],
      });
    } catch (error) {
      // If the error has an exitCode property, it has
      // been thrown from a script that has been run.
      if (error.exitCode) {
        process.exit(error.exitCode);
      } else {
        // If there is no exitCode, the error has to be in an earlier
        // part of the run function, e.g. because no package.json file exists
        // or the script name is not a part of it.
        //
        // Therefore we output the default error message from commander to
        // let the user know that the command or script was not found.
        console.error(
          `error: unknown script or command '${commands[0]}'. See 'coat --help'`
        );
        process.exit(1);
      }
    }
  });

  // Add coat logo to help command output
  program.addHelpText("beforeAll", getCoatHeader());

  return program;
}
