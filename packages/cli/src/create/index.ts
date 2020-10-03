import { promises as fs } from "fs";
import path from "path";
import execa from "execa";
import ora from "ora";
import chalk from "chalk";
import { sync } from "../sync";
import { getProjectName } from "./get-project-name";
import { getTemplateInfo } from "./get-template-info";
import {
  COAT_CLI_VERSION,
  PACKAGE_JSON_FILENAME,
  COAT_MANIFEST_FILENAME,
} from "../constants";
import { polish as jsonPolish } from "../file-types/json";
import { addInitialCommit } from "./add-initial-commit";
import {
  printCreateCustomizationHelp,
  printCreateHeader,
} from "./print-create-messages";

/**
 * Creates and generates a new coat project.
 *
 * @param template The template that should be used for the new project
 * @param directoryInput The optional path to the directory that should be used
 * @param projectNameInput The optional project name that has been provided
 */
export async function create(
  template: string,
  directoryInputUnsanitized?: string,
  projectNameInputUnsanitized?: string
): Promise<void> {
  // Prints the coat logo and header
  printCreateHeader();

  const directoryInput = directoryInputUnsanitized?.trim();
  const projectNameInput = projectNameInputUnsanitized?.trim();

  // Resolve the target directory and project name for the new coat project
  // from the cli arguments if they are available
  let targetCwd: string;
  let projectName: string;

  if (!directoryInput) {
    // No input for the target directory has been provided,
    // therefore the user should be prompted for a project name that
    // will be used as the target directory.
    //
    // The projectNameInput argument will be ignored, since it could have
    // only been passed via an edge case, e.g. when running
    // `coat create template "" my-project` which should not be supported.
    projectName = await getProjectName();

    // The project name should be used as the target directory in the current
    // working directory
    targetCwd = path.join(process.cwd(), projectName);
  } else {
    if (path.isAbsolute(directoryInput)) {
      // If the directory input is a valid absolute path, it should be used directly
      targetCwd = directoryInput;
    } else {
      // Otherwise, the directory input should be treated as a relative path
      // to the current working directory
      targetCwd = path.join(process.cwd(), directoryInput);
    }

    if (projectNameInput) {
      projectName = projectNameInput;
    } else {
      // Retrieve the trailing folder name of the target directory to use it
      // as the project name
      const suggestedProjectName = path.basename(targetCwd);
      if (suggestedProjectName === directoryInput) {
        // If the suggested project name matches the directory input argument
        // it should be used directly without prompting the user.
        //
        // This should be the most common scenario where create is run like
        // `coat create template my-project`
        // where both the directoryInput and suggested project name are "my-project"
        projectName = suggestedProjectName;
      } else {
        // If the suggested project name does not directly match the directory input,
        // the user should be prompted for a project name and with the trailing folder
        // name as the suggestion.
        //
        // This will likely be a scenario where the user calls coat create like:
        // (process.cwd = /usr/source/some-project)
        // `coat create template .`
        // -> suggested project name will be some-project
        projectName = await getProjectName(suggestedProjectName);
      }
    }
  }

  // Create the directory/directories if necessary
  await fs.mkdir(targetCwd, { recursive: true });

  // Check and throw an error if the target directory already contains any files.
  // This is in order to prevent accidental file loss and overwrites of any existing
  // files. In the future, a cli option could be provided to `coat create` which
  // ignores existing files in the target directory and continues without throwing
  // an error
  const directoryEntries = await fs.readdir(targetCwd);
  if (directoryEntries.length) {
    throw new Error(
      "Warning! The specified target diretory is not empty. Aborting to prevent accidental file loss or override."
    );
  }

  const packageJson = {
    name: projectName,
    version: "1.0.0",
  };
  // Create the package.json file inside the
  // target directory.
  await fs.writeFile(
    path.join(targetCwd, PACKAGE_JSON_FILENAME),
    // package.json does not need to be styled, since npm
    // will alter and format it while installing dependencies
    JSON.stringify(packageJson)
  );

  console.log(
    "\nCreating a new %s project in %s\n",
    chalk.cyan("coat"),
    chalk.green(targetCwd)
  );

  // Print getting started guidance for customization
  printCreateCustomizationHelp();

  console.log(
    "%s will install the project template and its dependencies into the project directory.\nThis might take a couple of minutes.\n",
    chalk.cyan("coat")
  );

  const installSpinner = ora(
    "Installing template into project directory\n"
  ).start();
  try {
    // Run npm install to install the template and its dependencies
    await execa("npm", ["install", "--save-exact", "--save-dev", template], {
      cwd: targetCwd,
    });

    // Templates should have a peerDependency on @coat/cli which could
    // differ from the version which is currently being run.
    // In order to run setup and sync with the correct @coat/cli version
    // peerDependencies of the template should be retrieved and installed
    // as devDependencies in the project
    const templateInfo = await getTemplateInfo(targetCwd);
    const peerDependenciesEntries = Object.entries(
      templateInfo.peerDependencies || {}
    );
    if (peerDependenciesEntries.length) {
      const peerDependencyPackages = peerDependenciesEntries.map(
        ([packageName, packageVersion]) => `${packageName}@${packageVersion}`
      );
      await execa("npm", ["install", "--save-dev", ...peerDependencyPackages], {
        cwd: targetCwd,
      });
    } else {
      // TODO: See #15
      // Warn that templates should have a peerDependency on @coat/cli
    }
    installSpinner.succeed();

    // Write the coat manifest file
    const coatManifest = {
      name: projectName,
      extends: templateInfo.name,
    };
    await fs.writeFile(
      path.join(targetCwd, COAT_MANIFEST_FILENAME),
      jsonPolish(coatManifest, COAT_MANIFEST_FILENAME)
    );
  } catch (error) {
    installSpinner.fail();

    // Re-throw error to provide feedback to the user
    throw error;
  }

  // Run setup and sync commands in the project directory
  //
  // Check whether @coat/cli is installed locally in the project
  const localCoatVersionTask = await execa(
    "npx",
    ["--no-install", "coat", "--version"],
    { cwd: targetCwd, reject: false }
  );
  if (localCoatVersionTask.exitCode === 0) {
    // Log a message if the locally installed coat version differs
    // from the current version in case an error occurs to make
    // potential troubleshooting more straightforward
    const localCoatVersion = localCoatVersionTask.stdout;
    if (localCoatVersion !== COAT_CLI_VERSION) {
      console.log(
        "Running %s with @coat/cli version %s\n",
        chalk.cyan("coat sync"),
        localCoatVersion
      );
    }

    // setup will be triggered via sync
    await execa("npx", ["--no-install", "coat", "sync"], {
      cwd: targetCwd,
      stdio: "inherit",
    });
  } else {
    // Run setup and sync directly with the currently running
    // @coat/cli version
    //
    // setup will be triggered implicitly via sync
    await sync(targetCwd);
  }

  // Initialize a git repository and add an initial commit
  // if the project was not created in an existing git repository
  await addInitialCommit(targetCwd);

  console.log(
    "🎊 Your new %s project has been successfully created! 🎊\n",
    chalk.cyan("coat")
  );
  console.log(
    "Get started by changing into your project folder: %s",
    chalk.cyan(`cd ${path.relative(process.cwd(), targetCwd)}`)
  );
  console.log(
    "You can ensure your generated files are up to date by running: %s\n",
    chalk.cyan("coat sync")
  );
  console.log("⚡️ Happy hacking! ⚡️\n");
}
