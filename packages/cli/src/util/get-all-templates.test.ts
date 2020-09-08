import path from "path";
import {
  COAT_GLOBAL_LOCKFILE_VERSION,
  COAT_LOCAL_LOCKFILE_VERSION,
} from "../constants";
import {
  getStrictCoatGlobalLockfile,
  getStrictCoatLocalLockfile,
} from "../lockfiles/get-strict-coat-lockfiles";
import { CoatContext } from "../types/coat-context";
import { getAllTemplates } from "./get-all-templates";
import { getStrictCoatManifest } from "./get-strict-coat-manifest";
import * as gatherExtendedTemplatesImport from "./gather-extended-templates";

const platformRoot = path.parse(process.cwd()).root;
const testCwd = path.join(platformRoot, "test");

describe("util/get-all-templates", () => {
  let gatherExtendedTemplatesSpy: jest.SpyInstance;

  beforeEach(() => {
    gatherExtendedTemplatesSpy = jest.spyOn(
      gatherExtendedTemplatesImport,
      "gatherExtendedTemplates"
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

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

  test("should call gather extended templates with context", () => {
    getAllTemplates(testContext);

    expect(gatherExtendedTemplatesSpy).toHaveBeenCalledTimes(1);
    expect(gatherExtendedTemplatesSpy).toHaveBeenLastCalledWith(testContext);
  });

  test("should include current coat manifest", () => {
    const result = getAllTemplates(testContext);
    expect(result).toEqual([
      getStrictCoatManifest({
        name: "test",
      }),
    ]);
  });
});
