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
    const validation = validateNpmPackageName(sanitizedProjectNameInput);
    if (validation.validForNewPackages) {
      projectName = sanitizedProjectNameInput;
    } else {
      console.warn(createProjectNameErrorMessage(validation));
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
        validate: (input) => {
          const validation = validateNpmPackageName(input);
          if (!validation.validForNewPackages) {
            return createProjectNameErrorMessage(validation);
          }
          return true;
        },
      },
    ]);
    projectName = answers.projectName;
  }
  return projectName;
}
