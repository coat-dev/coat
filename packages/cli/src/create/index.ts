import fs from "fs-extra";
import path from "path";
import execa from "execa";
import ora from "ora";
import chalk from "chalk";
import { PackageJson } from "type-fest";
import { getProjectName } from "./get-project-name";
import { getTemplateInfo } from "./get-template-info";
import { PACKAGE_JSON_FILENAME, COAT_MANIFEST_FILENAME } from "../constants";
import { polish as jsonPolish } from "../file-types/json";
import { addInitialCommit } from "./add-initial-commit";
import { printCreateCustomizationHelp } from "./print-create-customization-help";
import { getCoatHeader } from "../bin/get-coat-header";

/**
 * Creates and generates a new coat project.
 *
 * @param options.template The template that should be used for the new project
 * @param options.directory The optional path to the directory that should be used
 * @param options.projectName The optional project name that has been provided
 */
export async function create({
  template,
  directory,
  projectName,
}: {
  template: string;
  directory?: string;
  projectName?: string;
}): Promise<void> {
  // Print the coat logo and header
  console.log(getCoatHeader());

  const directoryInputSanitized = directory?.trim();
  const projectNameInputSanitized = projectName?.trim();

  // Resolve the target directory and project name for the new coat project
  // from the cli arguments if they are available
  let targetCwd: string;
  let usableProjectName: string;

  if (!directoryInputSanitized) {
    // No input for the target directory has been provided,
    // therefore the user should be prompted for a project name that
    // will be used as the target directory.
    //
    // The projectNameInput argument will be ignored, since it could have
    // only been passed via an edge case, e.g. when running
    // `coat create template "" my-project` which should not be supported.
    usableProjectName = await getProjectName();

    // The project name should be used as the target directory in the current
    // working directory
    targetCwd = path.join(process.cwd(), usableProjectName);
  } else {
    if (path.isAbsolute(directoryInputSanitized)) {
      // If the directory input is a valid absolute path, it should be used directly
      targetCwd = directoryInputSanitized;
    } else {
      // Otherwise, the directory input should be treated as a relative path
      // to the current working directory
      targetCwd = path.join(process.cwd(), directoryInputSanitized);
    }

    if (projectNameInputSanitized) {
      usableProjectName = projectNameInputSanitized;
    } else {
      // Retrieve the trailing folder name of the target directory to use it
      // as the project name
      const suggestedProjectName = path.basename(targetCwd);
      if (suggestedProjectName === directoryInputSanitized) {
        // If the suggested project name matches the directory input argument
        // it should be used directly without prompting the user.
        //
        // This should be the most common scenario where create is run like
        // `coat create template my-project`
        // where both the directoryInput and suggested project name are "my-project"
        usableProjectName = suggestedProjectName;
      } else {
        // If the suggested project name does not directly match the directory input,
        // the user should be prompted for a project name and with the trailing folder
        // name as the suggestion.
        //
        // This will likely be a scenario where the user calls coat create like:
        // (process.cwd = /usr/source/some-project)
        // `coat create template .`
        // -> suggested project name will be some-project
        usableProjectName = await getProjectName(suggestedProjectName);
      }
    }
  }

  // Check if a coat manifest file already exists in the project
  let coatManifestExists = false;
  try {
    await fs.readFile(path.join(targetCwd, COAT_MANIFEST_FILENAME));
    // If this line is reached the coat manifest file already exists
    coatManifestExists = true;
  } catch (error) {
    if (error.code !== "ENOENT") {
      // If the error is not due to a missing file, but e.g. due
      // to missing permissions it should be thrown to the user
      throw error;
    }
    // The coat manifest file does not exist in the target directory
  }

  if (coatManifestExists) {
    console.error(
      `A coat manifest file already exists in the target directory.\n\nPlease install the template manually via npm and add the name of the template to the existing coat manifest file.`
    );
    throw new Error("coat manifest file already exists");
  }

  // Check if a package.json file already exists
  // in the target directory, otherwise create it
  let previousPackageJson: PackageJson | undefined;
  try {
    const previousPackageJsonRaw = await fs.readFile(
      path.join(targetCwd, PACKAGE_JSON_FILENAME),
      "utf-8"
    );
    previousPackageJson = JSON.parse(previousPackageJsonRaw);
  } catch (error) {
    if (error.code !== "ENOENT") {
      // If the error is not due to a missing file, but e.g. due
      // to missing permissions it should be thrown to the user
      throw error;
    }
    // package.json does not exit in the target directory
  }

  if (!previousPackageJson) {
    const packageJson = {
      name: usableProjectName,
      version: "1.0.0",
    };
    // Create the package.json file inside the
    // target directory.
    await fs.outputFile(
      path.join(targetCwd, PACKAGE_JSON_FILENAME),
      // package.json does not need to be styled, since npm
      // will alter and format it while installing dependencies
      JSON.stringify(packageJson)
    );

    previousPackageJson = packageJson;
  }

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

    // We need to retrieve the correct template name,
    // since the template string that has been passed
    // to coat create could also be a local file path,
    // GitHub URL or npm tag
    const templateInfo = await getTemplateInfo(
      targetCwd,
      previousPackageJson,
      template,
      installSpinner
    );

    installSpinner.succeed();

    // Write the coat manifest file
    const coatManifest = {
      name: usableProjectName,
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
  // The current coat process is respawned to use a local
  // @coat/cli in case it is available after installing
  // the template, since templates should have a peerDependency
  // on the cli.
  //
  // The setup step will be triggered automatically by running sync
  await execa(process.argv[0], [process.argv[1], "sync"], {
    cwd: targetCwd,
    stdio: "inherit",
  });

  // Initialize a git repository and add an initial commit
  // if the project was not created in an existing git repository
  await addInitialCommit(targetCwd);

  console.log(
    "🎊 Your new %s project has been successfully created! 🎊\n",
    chalk.cyan("coat")
  );

  const relativePath = path.relative(process.cwd(), targetCwd);
  // Only log if relativePath exists, i.e. the user is in a different
  // directory than the project target directory
  if (relativePath) {
    console.log(
      "Get started by changing into your project folder: %s",
      chalk.cyan(`cd ${relativePath}`)
    );
  }

  console.log(
    "You can ensure your generated files are up to date by running: %s\n",
    chalk.cyan("coat sync")
  );
  console.log("⚡️ Happy hacking! ⚡️\n");
}
