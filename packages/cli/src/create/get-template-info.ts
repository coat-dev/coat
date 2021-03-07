import { promises as fs } from "fs";
import path from "path";
import tmp from "tmp";
import importFrom from "import-from";
import execa from "execa";
import chalk from "chalk";
import difference from "lodash/difference";
import { PackageJson } from "type-fest";
import { Ora } from "ora";
import { PACKAGE_JSON_FILENAME } from "../constants";

/**
 * Retrieves the package.json of a freshly installed
 * template in a project folder by comparing the package.json
 * files before and after the template has been installed.
 *
 * If the template has already been installed before in the project,
 * it will be installed again in to a temporary project to be able
 * to correctly retrieve the template name and manifest information.
 *
 * @param cwd The directory of the newly created coat project
 * @param previousPackageJson The previous package.json content, to compare it
 *   with the updated version after npm install has been run
 * @param template The template string that was used in `coat create`.
 *   Will be used to install the template in a temporary directory if necessary
 * @param installSpinner The loading spinner that is displayed during
 *   `coat create`. It will be updated in case the template has to be
 *   installed in a temporary directory
 */
export async function getTemplateInfo(
  cwd: string,
  previousPackageJson: PackageJson,
  template: string,
  installSpinner: Ora
): Promise<PackageJson> {
  // Retrieve the current package.json file for later comparison
  const currentPackageJsonRaw = await fs.readFile(
    path.join(cwd, PACKAGE_JSON_FILENAME),
    "utf-8"
  );
  const currentPackageJson = JSON.parse(
    currentPackageJsonRaw
  ) as PackageJson & {
    // devDependencies exist, since the template has just been installed as a devDependency
    devDependencies: Required<PackageJson>["devDependencies"];
  };

  // Get the name of the new devDependency that has been installed
  // to get the correct template name by comparing current devDependencies
  // to the previous devDependencies.
  // Since only a single dependency - the template itself - was installed,
  // it should be the only entry in the difference array
  const [templatePackageName] = difference(
    Object.keys(currentPackageJson.devDependencies),
    Object.keys(previousPackageJson.devDependencies ?? {})
  );

  if (templatePackageName) {
    // Import the package.json file of the template package
    return importFrom(
      cwd,
      `${templatePackageName}/${PACKAGE_JSON_FILENAME}`
    ) as PackageJson;
  }

  // If templatePackageName is undefined, it means that the
  // template already existed in the devDependencies of the
  // project.
  // Install the template again in a temporary directory to
  // retrieve the difference.
  // eslint-disable-next-line no-param-reassign
  installSpinner.text = `${chalk.cyan(
    "coat"
  )} was not able to determine the template name and peerDependencies directly by installing the template and has to do an extra round to retrieve information about the installed template.\nThis is likely due to the template already being installed in the project directory before. This might take a couple of minutes.\n`;
  //
  // Create a temporary directory
  const tmpDir = tmp.dirSync({ unsafeCleanup: true });
  // Write an empty package.json file into the temporary directory
  await fs.writeFile(
    path.join(tmpDir.name, PACKAGE_JSON_FILENAME),
    JSON.stringify({ name: "tmp-project-for-template-info", version: "1.0.0" })
  );
  // Install the template into the temporary directory
  await execa("npm", ["install", "--save-exact", "--save-dev", template], {
    cwd: tmpDir.name,
  });

  // Retrieve the updated temporary package.json file for comparison
  const tmpCurrentPackageJsonRaw = await fs.readFile(
    path.join(tmpDir.name, PACKAGE_JSON_FILENAME),
    "utf-8"
  );
  const tmpCurrentPackageJson = JSON.parse(
    tmpCurrentPackageJsonRaw
  ) as PackageJson & {
    // devDependencies exist, since the template has just been installed as a devDependency
    devDependencies: Required<PackageJson>["devDependencies"];
  };

  // Get the name of the new devDependency that has been installed
  // to get the correct template name by comparing current devDepndencies
  // to the previous devDependencies.
  // Since only a single dependency - the template itself - was installed,
  // it should be the only entry in the difference array
  const [tmpTemplatePackageName] = difference(
    Object.keys(tmpCurrentPackageJson.devDependencies),
    Object.keys({})
  );

  // Import the package.json file of the template package in the temporary
  // project directory
  const templateInfo = importFrom(
    tmpDir.name,
    `${tmpTemplatePackageName}/${PACKAGE_JSON_FILENAME}`
  ) as PackageJson;

  // Remove the temporary directory
  tmpDir.removeCallback();

  return templateInfo;
}
