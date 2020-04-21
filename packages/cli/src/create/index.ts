import { promises as fs } from "fs";
import path from "path";
import mkdirp from "mkdirp";
import execa from "execa";
import { setup } from "../setup";
import { sync } from "../sync";
import { getProjectName } from "./get-project-name";
import { retrieveTemplateInfo } from "./retrieve-template-info";
import { handlePromise } from "../util/delayed-promise";

export async function create(
  template: string,
  projectNameInput?: string,
  directoryInput?: string
): Promise<void> {
  // Kick off the request to retrieve information about the template
  // already, since the user still might be asked for a project name.
  // This way the time until the user entered the project name can be
  // used to already retrieve all necessary information to proceed with
  // creating the project.
  const retrieveTemplateInfoPromise = handlePromise(
    retrieveTemplateInfo(template)
  );

  const projectName = await getProjectName(projectNameInput);

  // Use the directoryInput from the cli argument or the project name if
  // no cli argument has been specified. Since the project name could contain
  // slashes which would lead to nested folders on Linux & macOS only
  // the trailing part of the project name should be used if it contains a slash.
  //
  // The cli argument from directoryInput is allowed to include path separators,
  // to enable more flexibility and the creation of projects in absolute paths,
  // inside nested folders or outside the current root directory.
  const targetDirectory =
    directoryInput || (projectName.split("/").pop() as string);

  // Create the directory/directories if necessary
  await mkdirp(targetDirectory);

  // Check and throw an error if the target directory already contains any files.
  // This is in order to prevent accidental file loss and overwrites of any existing
  // files. In the future, a cli option could be provided to `coat create` which
  // ignores existing files in the target directory and continues without throwing
  // an error
  const directoryEntries = await fs.readdir(targetDirectory);
  if (directoryEntries.length) {
    throw new Error(
      "Warning! The specified target diretory is not empty. Aborting to prevent accidental file loss or override."
    );
  }

  // Retrieve the package information of the coat template
  // from the npm registry in order to ensure that it exists and
  // get the correctly resolved version for the template for cases
  // where no specific version tag has been supplied.
  //
  // Peer dependencies of the template will also be added
  // to the devDependencies of the new project.
  const {
    name: templateName,
    version: templateVersion,
    peerDependencies,
  } = await retrieveTemplateInfoPromise;

  const coatManifest = {
    name: projectName,
    extends: template,
  };
  const packageJson = {
    name: projectName,
    version: "1.0.0",
    devDependencies: {
      [templateName]: templateVersion,
      ...peerDependencies,
    },
  };

  // Create the coat.json and package.json files inside the target
  // directory.
  //
  // TODO: Use the polish methods of the coat JSON file type once
  // the sync command is implemented.
  await Promise.all([
    fs.writeFile(
      path.join(targetDirectory, "package.json"),
      `${JSON.stringify(packageJson, null, 2)}\n`
    ),
    fs.writeFile(
      path.join(targetDirectory, "coat.json"),
      `${JSON.stringify(coatManifest, null, 2)}\n`
    ),
  ]);

  const targetCwd = path.join(process.cwd(), targetDirectory);
  // Run npm install to install the template and its dependencies
  // in the target folder to be able to run the setup & sync commands.
  console.log("Running npm install in the project directory");
  await execa("npm", ["install"], {
    cwd: targetCwd,
    stdio: "inherit",
  });

  // Run setup and sync commands in the project directory
  await setup(targetCwd);
  await sync(targetCwd);
}
