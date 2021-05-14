import { promises as fs } from "fs";
import path from "path";
import groupBy from "lodash/groupBy";
import chalk from "chalk";
import json5 from "json5";
import { parseExpression as parse } from "@babel/parser";
import { codeFrameColumns } from "@babel/code-frame";
import { CoatManifest } from "../types/coat-manifest";
import { COAT_MANIFEST_FILENAME } from "../constants";
import { getStrictCoatManifest } from "./get-strict-coat-manifest";
import { CoatContext } from "../types/coat-context";
import {
  getCoatGlobalLockfile,
  getCoatLocalLockfile,
} from "../lockfiles/get-coat-lockfiles";
import { getPackageJson } from "./get-package-json";
import { getLocationInJSONAst } from "./get-location-in-json-ast";
import { validateCoatManifest } from "../validation/coat-manifest";
import {
  ValidationIssueType,
  ValidationIssueError,
  ValidationIssueWarning,
} from "../validation/validation-issue";

/**
 * Retrieves and parses files that are relevant
 * for a coat project
 *
 * @param cwd The directory of a coat project
 */
export async function getContext(cwd: string): Promise<CoatContext> {
  // Read package.json & coat.json files
  // TODO: See #15
  // More friendly error messages if files are missing
  const [coatManifestRaw, coatGlobalLockfile, coatLocalLockfile, packageJson] =
    await Promise.all([
      fs.readFile(path.join(cwd, COAT_MANIFEST_FILENAME), "utf8"),
      getCoatGlobalLockfile(cwd),
      getCoatLocalLockfile(cwd),
      getPackageJson(cwd),
    ]);

  const coatManifest: CoatManifest = json5.parse(coatManifestRaw);

  // Validation
  const issues = [...validateCoatManifest(coatManifest)];
  if (issues.length) {
    const {
      [ValidationIssueType.Error]: errors = [],
      [ValidationIssueType.Warning]: warnings = [],
    } = groupBy(issues, "type") as {
      [ValidationIssueType.Error]: ValidationIssueError[];
      [ValidationIssueType.Warning]: ValidationIssueWarning[];
    };
    const validationMessages = [
      chalk`The coat manifest file ({green ${COAT_MANIFEST_FILENAME}}) has the following issue${
        issues.length > 1 ? "s" : ""
      }:`,
      "",
    ];

    validationMessages.push(
      ...warnings.map(
        (warning) => chalk`{inverse.yellow.bold  WARNING } - ${warning.message}`
      )
    );

    validationMessages.push(
      ...errors.map(
        (error) => chalk`{inverse.red.bold  ERROR } - ${error.message}`
      )
    );

    if (issues.length === 1 && errors.length === 1) {
      const [error] = errors;
      const coatManifestAst = parse(coatManifestRaw);
      const location = getLocationInJSONAst(
        coatManifestAst,
        error.propertyPath
      );
      const codeFrame = codeFrameColumns(coatManifestRaw, location, {
        highlightCode: true,
        message: error.shortMessage,
      });
      validationMessages.push("", codeFrame);
    }

    validationMessages.push("");
    console.error(validationMessages.join("\n"));

    if (errors.length) {
      throw new Error(
        `Validation of coat manifest threw ${
          errors.length > 1 ? "errors" : "an error"
        }.`
      );
    }
  }

  const coatManifestStrict = getStrictCoatManifest(coatManifest);

  return {
    cwd,
    coatManifest: coatManifestStrict,
    coatGlobalLockfile,
    coatLocalLockfile,
    packageJson,
  };
}
