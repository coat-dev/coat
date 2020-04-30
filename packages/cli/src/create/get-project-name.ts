import { prompt } from "inquirer";
import validateNpmPackageName from "validate-npm-package-name";

function sanitizeProjectName(input: string): string {
  return input.trim();
}

function createProjectNameErrorMessage(
  validation: validateNpmPackageName.Result
): string {
  return `The project name must be a valid npm package name: ${[
    ...(validation.warnings ?? []),
    ...(validation.errors ?? []),
  ].join(", ")}`;
}

/**
 * Returns true when a project name is valid for coat.
 * If it is invalid, then a string is returned which can be used as
 * the error message to the user. This format is chosen to be
 * compatible with the inquirer validation methods.
 */
function validateProjectName(projectName: string): string | true {
  const npmValidation = validateNpmPackageName(projectName);
  if (npmValidation.validForNewPackages) {
    return true;
  }
  return createProjectNameErrorMessage(npmValidation);
}

export async function getProjectName(
  projectNameInput: string | undefined
): Promise<string> {
  let projectName = "";
  // The project name must be a valid npm package name and is placed as the name of
  // the resulting package.json file.
  //
  // See official docs: https://docs.npmjs.com/creating-a-package-json-file
  // Also see validate-npm-package-name: https://github.com/npm/validate-npm-package-name
  if (projectNameInput) {
    const sanitizedProjectNameInput = sanitizeProjectName(projectNameInput);
    const validationResult = validateProjectName(sanitizedProjectNameInput);
    if (validationResult === true) {
      projectName = sanitizedProjectNameInput;
    } else {
      console.warn(validationResult);
    }
  }

  // If no project name is specified with the command - or the specified project name is
  // not valid - the user should be prompted for the project name.
  if (!projectName) {
    const answers = await prompt([
      {
        name: "projectName",
        message: "Enter the name of your new project",
        filter: sanitizeProjectName,
        default: projectNameInput,
        validate: validateProjectName,
      },
    ]);
    projectName = answers.projectName;
  }
  return projectName;
}
