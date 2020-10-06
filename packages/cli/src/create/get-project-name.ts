import { prompt } from "inquirer";

/**
 * Trims the project name.
 * Only exported for testing
 *
 * @param projectName  The project name that should be trimmed
 */
export function sanitizeProjectName(projectName: string): string {
  return projectName.trim();
}

/**
 * Validates that the project name can be used for the coat manifest.
 * Only exported for testing.
 *
 * @param projectName The project name that should be validated
 */
export function validateProjectName(projectName: string): boolean {
  return projectName.length > 0;
}

/**
 * Prompts for the project name for the coat project that will be created.
 *
 * @param suggestedName An optional suggested name that the user will be prompted with
 */
export async function getProjectName(suggestedName?: string): Promise<string> {
  const { projectName } = await prompt([
    {
      name: "projectName",
      message: "Enter the name of your new project",
      filter: sanitizeProjectName,
      default: suggestedName || "my-project",
      validate: validateProjectName,
    },
  ]);
  return projectName;
}
