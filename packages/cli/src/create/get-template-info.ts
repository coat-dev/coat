import { promises as fs } from "fs";
import path from "path";
import importFrom from "import-from";
import { PackageJson } from "type-fest";
import { PACKAGE_JSON_FILENAME } from "../constants";

/**
 * Retrieves the package.json of a freshly installed
 * template in a project folder. This function should
 * only be used for newly installed projects with a single
 * devDependency, since that dependency is assumed to be the
 * template of the coat project
 *
 * @param cwd The directory of the newly created coat project
 */
export async function getTemplateInfo(cwd: string): Promise<PackageJson> {
  // Retrieve the template from package.json
  const projectPackageJsonPath = path.join(cwd, PACKAGE_JSON_FILENAME);
  const projectPackageJsonRaw = await fs.readFile(
    projectPackageJsonPath,
    "utf8"
  );
  const projectPackageJson = JSON.parse(projectPackageJsonRaw);

  // The template should be the only devDependency in the project
  // since it has been newly created with `coat create`
  const templatePackageName = Object.keys(
    projectPackageJson.devDependencies
  )[0];

  // Import the package.json file of the template package
  return importFrom(
    cwd,
    `${templatePackageName}/${PACKAGE_JSON_FILENAME}`
  ) as PackageJson;
}
