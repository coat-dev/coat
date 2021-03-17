import { CoatManifest } from "../../types/coat-manifest";
import { formatPropertyPath } from "../format-property-path";
import { ValidationIssue, ValidationIssueType } from "../validation-issue";

export function* validateCoatManifestExtends(
  extendsProp: CoatManifest["extends"]
): Generator<ValidationIssue, void, void> {
  if (typeof extendsProp !== "undefined") {
    if (typeof extendsProp !== "string" && !Array.isArray(extendsProp)) {
      yield {
        type: ValidationIssueType.Error,
        message: `${formatPropertyPath([
          "extends",
        ])} must either be a template name or an array of templates.`,
        propertyPath: ["extends"],
        shortMessage:
          "must either be a template name or an array of templates.",
      };
    }

    // should not be empty if it is a string
    if (typeof extendsProp === "string" && !extendsProp) {
      yield {
        type: ValidationIssueType.Error,
        message: `${formatPropertyPath([
          "extends",
        ])} template name must not be empty.`,
        propertyPath: ["extends"],
        shortMessage: "template name must not be empty.",
      };
    } else if (Array.isArray(extendsProp)) {
      for (const [index, extendsEntry] of extendsProp.entries()) {
        // should either be a non-empty string or a tuple
        if (typeof extendsEntry !== "string" && !Array.isArray(extendsEntry)) {
          yield {
            type: ValidationIssueType.Error,
            message: `${formatPropertyPath([
              "extends",
              index,
            ])} array entries must either be a template name or tuple ([templateName, { templateConfig: true }]).`,
            propertyPath: ["extends", index],
            shortMessage:
              "must either be a template name or a tuple ([templateName, { templateConfig: true }]).",
          };
        } else if (typeof extendsEntry === "string") {
          if (!extendsEntry) {
            yield {
              type: ValidationIssueType.Error,
              message: `${formatPropertyPath([
                "extends",
                index,
              ])} template name must not be empty.`,
              propertyPath: ["extends", index],
              shortMessage: "template name must not be empty.",
            };
          }
        } else {
          if (extendsEntry.length !== 2) {
            yield {
              type: ValidationIssueType.Error,
              message: `${formatPropertyPath([
                "extends",
                index,
              ])} tuple entries must be couples (e.g. [templateName, { templateConfig: true }]).`,
              propertyPath: ["extends", index],
              shortMessage:
                "must be a couple (e.g. [templateName, { templateConfig: true }]).",
            };
          } else {
            if (typeof extendsEntry[0] !== "string" || !extendsEntry[0]) {
              yield {
                type: ValidationIssueType.Error,
                message: `${formatPropertyPath([
                  "extends",
                  index,
                ])} tuple entries must have a template name as the first member.`,
                propertyPath: ["extends", index, 0],
                shortMessage: "must be a template name.",
              };
            }
            if (
              typeof extendsEntry[1] !== "object" ||
              Array.isArray(extendsEntry[1]) ||
              extendsEntry[1] === null
            ) {
              yield {
                type: ValidationIssueType.Error,
                message: `${formatPropertyPath([
                  "extends",
                  index,
                ])} tuple entries must have a configuration object as the second member.`,
                propertyPath: ["extends", index, 1],
                shortMessage: "must be a configuration object",
              };
            }
          }
        }
      }
    }
  }
}
