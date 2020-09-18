import { promises as fs } from "fs";
import fsExtra from "fs-extra";
import path from "path";
import execa from "execa";
import ora from "ora";
import { sync } from "../sync";
import { getProjectName } from "./get-project-name";
import { getTemplateInfo } from "./get-template-info";
import {
  COAT_CLI_VERSION,
  PACKAGE_JSON_FILENAME,
  COAT_MANIFEST_FILENAME,
} from "../constants";
import { polish as jsonPolish } from "../file-types/json";

/**
 * Creates and generates a new coat project.
 *
 * @param template The template that should be used for the new project
 * @param projectNameInput The optional project name that has been provided
 * @param directoryInput The optional path to the directory that should be used
 */
export async function create(
  template: string,
  projectNameInput?: string,
  directoryInput?: string
): Promise<void> {
  const projectName = await getProjectName(projectNameInput);

  // Use the directoryInput from the cli argument or the project name if
  // no cli argument has been specified. Since the project name could contain
  // slashes which would lead to nested folders on Linux & macOS only
  // the trailing part of the project name should be used if it contains a slash.
  //
  // The cli argument from directoryInput is allowed to include path separators,
  // to enable more flexibility and the creation of projects in absolute paths,
  // inside nested folders or outside the current root directory.
  let targetDirectoryIsInferred: boolean;
  let targetDirectory: string;
  if (directoryInput) {
    targetDirectoryIsInferred = false;
    targetDirectory = directoryInput;
  } else {
    targetDirectoryIsInferred = true;
    targetDirectory = projectName.split("/").pop() as string;
  }

  // Create the directory/directories if necessary
  await fs.mkdir(targetDirectory, { recursive: true });

  // Check and throw an error if the target directory already contains any files.
  // This is in order to prevent accidental file loss and overwrites of any existing
  // files. In the future, a cli option could be provided to `coat create` which
  // ignores existing files in the target directory and continues without throwing
  // an error
  const directoryEntries = await fs.readdir(targetDirectory);
  if (directoryEntries.length) {
    throw "Warning! The specified target diretory is not empty. Aborting to prevent accidental file loss or override.";
  }

  const packageJson = {
    name: projectName,
    version: "1.0.0",
  };
  // Create the package.json file inside the
  // target directory.
  await fs.writeFile(
    path.join(targetDirectory, PACKAGE_JSON_FILENAME),
    // package.json does not need to be styled, since npm
    // will alter and format it while installing dependencies
    JSON.stringify(packageJson)
  );

  let targetCwd: string;
  if (path.isAbsolute(targetDirectory)) {
    targetCwd = targetDirectory;
  } else {
    targetCwd = path.join(process.cwd(), targetDirectory);
  }

  // Run npm install to install the template and its dependencies
  const installSpinner = ora(
    "Installing template into project directory"
  ).start();
  try {
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
      path.join(targetDirectory, COAT_MANIFEST_FILENAME),
      jsonPolish(coatManifest, COAT_MANIFEST_FILENAME)
    );
  } catch (error) {
    installSpinner.fail();
    // Remove created project files and the created directory to enable the user
    // to easily re-run the coat create command again in case
    // this was a network issue or it should be re-run with fixed
    // arguments.
    //
    // The target directory will only be removed in case it has been
    // inferred from the project name, if it has been supplied
    // by the user it is not removed since it might lead to data loss
    // depending on the provided path. (e.g. when specifying ../a/b/c or
    // an absolute path as the target directory it should be up to the
    // user to decide what happens with intermediate directories which might
    // have been created
    if (targetDirectoryIsInferred) {
      await fsExtra.remove(targetCwd);
    } else {
      // If the target directory has been specified from the user
      // it should still be cleaned out to allow the user to run
      // coat create again without throwing an error due to
      // existing files in the target directory.
      // This operation is safe until the check for existing files
      // above is in place. In case that check gets removed, cleaning
      // out the target directory should be re-evaluated.
      await fsExtra.emptyDir(targetCwd);
    }

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
        "Running coat setup and coat sync with @coat/cli version %s",
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
}
