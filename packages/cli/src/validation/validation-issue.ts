export enum ValidationIssueType {
  Warning = "WARNING",
  Error = "ERROR",
}

interface ValidationIssueBase {
  type: ValidationIssueType;
  /**
   * The validation issue message that will be displayed to the user
   */
  message: string;
  /**
   * The path to the property, to display a code frame surrounding the
   * validation issue. This property must be defined on the object.
   */
  propertyPath: (string | number)[];
}

export interface ValidationIssueError extends ValidationIssueBase {
  type: ValidationIssueType.Error;
  /**
   * A short validation error message that will be displayed inline
   * with the source code if possible
   */
  shortMessage: string;
}

export interface ValidationIssueWarning extends ValidationIssueBase {
  type: ValidationIssueType.Warning;
}

export type ValidationIssue = ValidationIssueError | ValidationIssueWarning;
