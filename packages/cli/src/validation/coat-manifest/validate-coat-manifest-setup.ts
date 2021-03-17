import chalk from "chalk";
import { CoatManifest } from "../../types/coat-manifest";
import { CoatManifestTask } from "../../types/coat-manifest-tasks";
import { findPotentialPropertyMatch } from "../find-potential-property-match";
import { formatPropertyPath } from "../format-property-path";
import { handleUnknownProperties } from "../handle-unknown-properties";
import { ValidationIssue, ValidationIssueType } from "../validation-issue";

function* validateCoatManifestTask(
  task: CoatManifestTask,
  index: number
): Generator<ValidationIssue, void, void> {
  if (typeof task !== "object" || Array.isArray(task) || task === null) {
    yield {
      type: ValidationIssueType.Error,
      message: `${formatPropertyPath(["setup", index])} must be an object.`,
      propertyPath: ["setup", index],
      shortMessage: "must be an object.",
    };
    return;
  }

  const { id, run, local, shouldRun, ...additionalProps } = task;

  const additionalPropKeys = new Set(
    Object.keys(additionalProps).filter((prop) => prop !== "runOnCi")
  );

  if (typeof id === "undefined") {
    const potentialPropertyMatch = findPotentialPropertyMatch("id", [
      ...additionalPropKeys,
    ]);
    if (potentialPropertyMatch) {
      additionalPropKeys.delete(potentialPropertyMatch);
      yield {
        type: ValidationIssueType.Error,
        message: chalk`${formatPropertyPath([
          "setup",
          index,
          "id",
        ])} must be a non-empty string. Did you misspell {magenta ${potentialPropertyMatch}}?`,
        propertyPath: ["setup", index, potentialPropertyMatch],
        shortMessage: chalk`did you mean to write {magenta id}?`,
      };
    } else {
      yield {
        type: ValidationIssueType.Error,
        message: chalk`${formatPropertyPath([
          "setup",
          index,
        ])} must have a {magenta id} property with a non-empty string.`,
        propertyPath: ["setup", index],
        shortMessage: chalk`must have a {magenta id} property with a non-empty string.`,
      };
    }
  } else if (typeof id !== "string" || !id) {
    yield {
      type: ValidationIssueType.Error,
      message: `${formatPropertyPath([
        "setup",
        index,
        "id",
      ])} must be a non-empty string.`,
      propertyPath: ["setup", index, "id"],
      shortMessage: "must be a non-empty string.",
    };
  }

  if (typeof run === "undefined") {
    const potentialPropertyMatch = findPotentialPropertyMatch("run", [
      ...additionalPropKeys,
    ]);
    if (potentialPropertyMatch) {
      additionalPropKeys.delete(potentialPropertyMatch);
      yield {
        type: ValidationIssueType.Error,
        message: chalk`${formatPropertyPath([
          "setup",
          index,
          "run",
        ])} must be a function. Did you misspell {magenta ${potentialPropertyMatch}}?`,
        propertyPath: ["setup", index, potentialPropertyMatch],
        shortMessage: chalk`did you mean to write {magenta run}?`,
      };
    } else {
      yield {
        type: ValidationIssueType.Error,
        message: chalk`${formatPropertyPath([
          "setup",
          index,
        ])} must have a {magenta run} property with a function.`,
        propertyPath: ["setup", index],
        shortMessage: chalk`must have a {magenta run} property with a function.`,
      };
    }
  } else if (typeof run !== "function") {
    yield {
      type: ValidationIssueType.Error,
      message: `${formatPropertyPath([
        "setup",
        index,
        "run",
      ])} must be a function.`,
      propertyPath: ["setup", index, "run"],
      shortMessage: "must be a function.",
    };
  }

  if (typeof local !== "undefined" && typeof local !== "boolean") {
    yield {
      type: ValidationIssueType.Error,
      message: `${formatPropertyPath([
        "setup",
        index,
        "local",
      ])} must be a boolean.`,
      propertyPath: ["setup", index, "local"],
      shortMessage: "must be a boolean.",
    };
  }

  if (task.local) {
    if (
      typeof task.runOnCi !== "undefined" &&
      typeof task.runOnCi !== "boolean"
    ) {
      yield {
        type: ValidationIssueType.Error,
        message: `${formatPropertyPath([
          "setup",
          index,
          "runOnCi",
        ])} must be a boolean.`,
        propertyPath: ["setup", index, "runOnCi"],
        shortMessage: "must be a boolean.",
      };
    }
  } else if ("runOnCi" in task) {
    yield {
      type: ValidationIssueType.Warning,
      message: `${formatPropertyPath([
        "setup",
        index,
        "runOnCi",
      ])} is only used for local tasks, since global tasks are never run on CI.`,
      propertyPath: ["setup", index, "runOnCi"],
    };
  }

  if (typeof shouldRun !== "undefined" && typeof shouldRun !== "function") {
    yield {
      type: ValidationIssueType.Error,
      message: `${formatPropertyPath([
        "setup",
        index,
        "shouldRun",
      ])} must be a function.`,
      propertyPath: ["setup", index, "shouldRun"],
      shortMessage: "must be a function.",
    };
  }

  const allOptionalProps = ["local", "shouldRun"];
  if (task.local) {
    allOptionalProps.push("runOnCi");
  }

  yield* handleUnknownProperties({
    allOptionalProps,
    declaredProps: Object.keys(task),
    unknownProps: [...additionalPropKeys],
    propertyPrefixPath: ["setup", index],
  });
}

export function* validateCoatManifestSetup(
  setup: CoatManifest["setup"]
): Generator<ValidationIssue, void, void> {
  if (typeof setup === "undefined") {
    return;
  }

  if (!Array.isArray(setup)) {
    yield {
      type: ValidationIssueType.Error,
      message: `${formatPropertyPath(["setup"])} must be an array.`,
      propertyPath: ["setup"],
      shortMessage: "must be an array.",
    };
    return;
  }

  for (const [index, task] of setup.entries()) {
    yield* validateCoatManifestTask(task, index);
  }
}
