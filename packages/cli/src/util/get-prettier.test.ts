import path from "path";
import importFrom from "import-from";
import prettier from "prettier";
import {
  COAT_GLOBAL_LOCKFILE_VERSION,
  COAT_LOCAL_LOCKFILE_VERSION,
} from "../constants";
import {
  getStrictCoatGlobalLockfile,
  getStrictCoatLocalLockfile,
} from "../lockfiles/get-strict-coat-lockfiles";
import { CoatContext } from "../types/coat-context";
import { getPrettier } from "./get-prettier";
import { getStrictCoatManifest } from "./get-strict-coat-manifest";

jest.mock("import-from");

const platformRoot = path.parse(process.cwd()).root;
const testCwd = path.join(platformRoot, "test");

const importFromMock = (importFrom.silent as unknown) as jest.Mock;

describe("util/get-prettier", () => {
  const testContext: CoatContext = {
    cwd: testCwd,
    coatManifest: getStrictCoatManifest({
      name: "test",
    }),
    packageJson: {},
    coatGlobalLockfile: getStrictCoatGlobalLockfile({
      version: COAT_GLOBAL_LOCKFILE_VERSION,
    }),
    coatLocalLockfile: getStrictCoatLocalLockfile({
      version: COAT_LOCAL_LOCKFILE_VERSION,
    }),
  };
  test("should return coat's prettier version without context", () => {
    expect(getPrettier(undefined)).toBe(prettier);
  });

  test("should return coat's prettier version if import fails", () => {
    expect(getPrettier(testContext)).toBe(prettier);
  });

  test("should imported prettier version if it exists", () => {
    const importedPrettier = jest.fn();
    importFromMock.mockImplementationOnce(() => importedPrettier);

    expect(getPrettier(testContext)).toBe(importedPrettier);
  });
});
