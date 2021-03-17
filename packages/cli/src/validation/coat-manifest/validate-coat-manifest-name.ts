import { CoatManifest } from "../../types/coat-manifest";
import { formatPropertyPath } from "../format-property-path";
import { ValidationIssue, ValidationIssueType } from "../validation-issue";

export function* validateCoatManifestName(
  name: CoatManifest["name"]
): Generator<ValidationIssue, void, void> {
  // name should either be missing or a string
  const validNameTypes = ["undefined", "string"];
  if (!validNameTypes.includes(typeof name)) {
    yield {
      type: ValidationIssueType.Error,
      message: `${formatPropertyPath(["name"])} must be a string.`,
      propertyPath: ["name"],
      shortMessage: "must be a string.",
    };
  }
}
