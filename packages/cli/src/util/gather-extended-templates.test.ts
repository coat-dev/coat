import resolveFrom from "resolve-from";
import importFrom from "import-from";
import stripAnsi from "strip-ansi";
import { gatherExtendedTemplates } from "./gather-extended-templates";
import { CoatContext } from "../types/coat-context";
import { CoatManifestStrict } from "../types/coat-manifest";
import { getStrictCoatManifest } from "./get-strict-coat-manifest";
import {
  getStrictCoatGlobalLockfile,
  getStrictCoatLocalLockfile,
} from "../lockfiles/get-strict-coat-lockfiles";
import {
  COAT_GLOBAL_LOCKFILE_VERSION,
  COAT_LOCAL_LOCKFILE_VERSION,
} from "../constants";
import { validateCoatManifest } from "../validation/coat-manifest";
import {
  ValidationIssue,
  ValidationIssueType,
} from "../validation/validation-issue";

jest
  .mock("resolve-from")
  .mock("import-from")
  .mock("../validation/coat-manifest");

const testCwd = "test";

const resolveFromMock = resolveFrom as unknown as jest.Mock;
const importFromMock = importFrom as unknown as jest.Mock;

type CoatStrictTemplate = CoatManifestStrict | (() => CoatManifestStrict);

let testExtendedTemplates: {
  [template: string]:
    | CoatStrictTemplate
    | { default: CoatStrictTemplate; __esModule: { value: true } };
};

const validateCoatManifestMock = validateCoatManifest as unknown as jest.Mock;

describe("sync/gather-extended-templates", () => {
  let consoleErrorSpy: jest.SpyInstance<
    ReturnType<typeof console.error>,
    Parameters<typeof console.error>,
    unknown
  >;

  beforeEach(() => {
    resolveFromMock.mockImplementation(
      (cwd, template) => `${cwd}/${template}/index.js`
    );
    importFromMock.mockImplementation((cwd, template) => {
      return testExtendedTemplates[`${cwd}/${template}`];
    });
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {
      // Ignore error messages
    });
    validateCoatManifestMock.mockReturnValue([]);

    testExtendedTemplates = {
      [`${testCwd}/template`]: getStrictCoatManifest({
        name: "template",
      }),
      [`${testCwd}/template-es6`]: {
        default: getStrictCoatManifest({
          name: "template",
        }),
        __esModule: { value: true },
      },
      [`${testCwd}/template-fn-result`]: getStrictCoatManifest({
        name: "template-fn",
      }),
      [`${testCwd}/template-fn`]: jest.fn<CoatManifestStrict, []>(
        () =>
          testExtendedTemplates[
            `${testCwd}/template-fn-result`
          ] as CoatManifestStrict
      ),
      // nested test templates
      // nested-1 (obj): nested-1-A (fn), nested-1-B (obj)
      // nested-2 (fn): nested-2-A (fn), nested-2-B (obj), nested-common-template (obj)
      // nested-2-A (fn): nested-2-A-1 (obj), nested-2-A-2 (fn)
      // nested-2-B (obj): nested-common-template (obj)
      // nested-3 (obj): (no extended template)
      [`${testCwd}/nested`]: getStrictCoatManifest({
        name: "nested",
        extends: [
          "nested-1",
          ["nested-2", { nested2: "config-value" }],
          "nested-3",
        ],
      }),
      [`${testCwd}/nested/nested-1`]: getStrictCoatManifest({
        name: "nested-1",
        extends: ["nested-1-A", "nested-1-B"],
      }),
      [`${testCwd}/nested/nested-1/nested-1-A-result`]: getStrictCoatManifest({
        name: "nested-1-A",
      }),
      [`${testCwd}/nested/nested-1/nested-1-A`]: jest.fn<
        CoatManifestStrict,
        []
      >(
        () =>
          testExtendedTemplates[
            `${testCwd}/nested/nested-1/nested-1-A-result`
          ] as CoatManifestStrict
      ),
      [`${testCwd}/nested/nested-1/nested-1-B`]: getStrictCoatManifest({
        name: "nested-1-B",
      }),
      [`${testCwd}/nested/nested-2-result`]: getStrictCoatManifest({
        name: "nested-2",
        extends: ["nested-2-A", "nested-2-B", "nested-common-template"],
      }),
      [`${testCwd}/nested/nested-2`]: jest.fn<CoatManifestStrict, []>(
        () =>
          testExtendedTemplates[
            `${testCwd}/nested/nested-2-result`
          ] as CoatManifestStrict
      ),
      [`${testCwd}/nested/nested-2/nested-2-A-result`]: getStrictCoatManifest({
        name: "nested-2-A",
        extends: [
          "nested-2-A-1",
          ["nested-2-A-2", { nested2A2: "config-value" }],
        ],
      }),
      [`${testCwd}/nested/nested-2/nested-2-A`]: jest.fn<
        CoatManifestStrict,
        []
      >(
        () =>
          testExtendedTemplates[
            `${testCwd}/nested/nested-2/nested-2-A-result`
          ] as CoatManifestStrict
      ),
      [`${testCwd}/nested/nested-2/nested-2-A/nested-2-A-1`]:
        getStrictCoatManifest({
          name: "nested-2-A-1",
        }),
      [`${testCwd}/nested/nested-2/nested-2-A/nested-2-A-2-result`]:
        getStrictCoatManifest({
          name: "nested-2-A-2",
        }),
      [`${testCwd}/nested/nested-2/nested-2-A/nested-2-A-2`]: jest.fn<
        CoatManifestStrict,
        []
      >(
        () =>
          testExtendedTemplates[
            `${testCwd}/nested/nested-2/nested-2-A/nested-2-A-2-result`
          ] as CoatManifestStrict
      ),
      [`${testCwd}/nested/nested-2/nested-2-B`]: getStrictCoatManifest({
        name: "nested-2-B",
        extends: ["nested-common-template"],
      }),
      [`${testCwd}/nested/nested-2/nested-2-B/nested-common-template`]:
        getStrictCoatManifest({
          name: "nested-common-template",
          dependencies: {
            dependencies: {
              "from-2-B": "^1.0.0",
            },
          },
        }),
      [`${testCwd}/nested/nested-2/nested-common-template`]:
        getStrictCoatManifest({
          name: "nested-common-template",
          dependencies: {
            dependencies: {
              "from-2": "^1.0.0",
            },
          },
        }),
      [`${testCwd}/nested/nested-3`]: getStrictCoatManifest({
        name: "nested-3",
      }),
    };
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("should retrieve a single extended template exporting a manifest", () => {
    const coatContext: CoatContext = {
      cwd: testCwd,
      coatManifest: getStrictCoatManifest({
        name: "testManifest",
        extends: ["template"],
      }),
      packageJson: {},
      coatGlobalLockfile: getStrictCoatGlobalLockfile({
        version: COAT_GLOBAL_LOCKFILE_VERSION,
      }),
      coatLocalLockfile: getStrictCoatLocalLockfile({
        version: COAT_LOCAL_LOCKFILE_VERSION,
      }),
    };
    const templates = gatherExtendedTemplates(coatContext);
    expect(templates).toEqual([testExtendedTemplates[`${testCwd}/template`]]);
  });

  test("should retrieve a template that is using a es6 module default export", () => {
    const coatContext: CoatContext = {
      cwd: testCwd,
      coatManifest: getStrictCoatManifest({
        name: "testManifest",
        extends: ["template-es6"],
      }),
      packageJson: {},
      coatGlobalLockfile: getStrictCoatGlobalLockfile({
        version: COAT_GLOBAL_LOCKFILE_VERSION,
      }),
      coatLocalLockfile: getStrictCoatLocalLockfile({
        version: COAT_LOCAL_LOCKFILE_VERSION,
      }),
    };
    const templates = gatherExtendedTemplates(coatContext);
    const expectedTemplate = testExtendedTemplates[
      `${testCwd}/template-es6`
    ] as { default: CoatStrictTemplate };
    expect(templates).toEqual([expectedTemplate.default]);
  });

  test("should retrieve a single extended template exporting a function", () => {
    const coatContext: CoatContext = {
      cwd: testCwd,
      coatManifest: getStrictCoatManifest({
        name: "testManifest",
        extends: ["template-fn"],
      }),
      packageJson: {},
      coatGlobalLockfile: getStrictCoatGlobalLockfile({
        version: COAT_GLOBAL_LOCKFILE_VERSION,
      }),
      coatLocalLockfile: getStrictCoatLocalLockfile({
        version: COAT_LOCAL_LOCKFILE_VERSION,
      }),
    };
    const templates = gatherExtendedTemplates(coatContext);
    expect(templates).toEqual([
      testExtendedTemplates[`${testCwd}/template-fn-result`],
    ]);
  });

  test("should call templates that export functions with the coatContext", () => {
    const coatContext: CoatContext = {
      cwd: testCwd,
      coatManifest: getStrictCoatManifest({
        name: "testManifest",
        extends: ["template-fn"],
      }),
      packageJson: {},
      coatGlobalLockfile: getStrictCoatGlobalLockfile({
        version: COAT_GLOBAL_LOCKFILE_VERSION,
      }),
      coatLocalLockfile: getStrictCoatLocalLockfile({
        version: COAT_LOCAL_LOCKFILE_VERSION,
      }),
    };

    gatherExtendedTemplates(coatContext);

    expect(
      testExtendedTemplates[`${testCwd}/template-fn`]
    ).toHaveBeenCalledTimes(1);
    expect(
      testExtendedTemplates[`${testCwd}/template-fn`]
    ).toHaveBeenCalledWith({ coatContext, config: {} });
  });

  test("should resolve nested templates from their own directory to allow for multiple versions of a specific template", () => {
    const coatContext: CoatContext = {
      cwd: testCwd,
      coatManifest: getStrictCoatManifest({
        name: "testManifest",
        extends: ["nested"],
      }),
      packageJson: {},
      coatGlobalLockfile: getStrictCoatGlobalLockfile({
        version: COAT_GLOBAL_LOCKFILE_VERSION,
      }),
      coatLocalLockfile: getStrictCoatLocalLockfile({
        version: COAT_LOCAL_LOCKFILE_VERSION,
      }),
    };

    const templates = gatherExtendedTemplates(coatContext);
    const templateResults = [
      testExtendedTemplates[`${testCwd}/nested/nested-1/nested-1-A-result`],
      testExtendedTemplates[`${testCwd}/nested/nested-1/nested-1-B`],
      testExtendedTemplates[`${testCwd}/nested/nested-1`],
      testExtendedTemplates[
        `${testCwd}/nested/nested-2/nested-2-A/nested-2-A-1`
      ],
      testExtendedTemplates[
        `${testCwd}/nested/nested-2/nested-2-A/nested-2-A-2-result`
      ],
      testExtendedTemplates[`${testCwd}/nested/nested-2/nested-2-A-result`],
      testExtendedTemplates[
        `${testCwd}/nested/nested-2/nested-2-B/nested-common-template`
      ],
      testExtendedTemplates[`${testCwd}/nested/nested-2/nested-2-B`],
      testExtendedTemplates[
        `${testCwd}/nested/nested-2/nested-common-template`
      ],
      testExtendedTemplates[`${testCwd}/nested/nested-2-result`],
      testExtendedTemplates[`${testCwd}/nested/nested-3`],
      testExtendedTemplates[`${testCwd}/nested`],
    ];
    expect(templates).toEqual(templateResults);
  });

  test("should call nested templates that export a function with the coat context and the requested template config", () => {
    const coatContext: CoatContext = {
      cwd: testCwd,
      coatManifest: getStrictCoatManifest({
        name: "testManifest",
        extends: ["nested"],
      }),
      packageJson: {},
      coatGlobalLockfile: getStrictCoatGlobalLockfile({
        version: COAT_GLOBAL_LOCKFILE_VERSION,
      }),
      coatLocalLockfile: getStrictCoatLocalLockfile({
        version: COAT_LOCAL_LOCKFILE_VERSION,
      }),
    };

    gatherExtendedTemplates(coatContext);

    expect(
      testExtendedTemplates[`${testCwd}/nested/nested-1/nested-1-A`]
    ).toHaveBeenCalledTimes(1);
    expect(
      testExtendedTemplates[`${testCwd}/nested/nested-1/nested-1-A`]
    ).toHaveBeenCalledWith({ coatContext, config: {} });

    expect(
      testExtendedTemplates[`${testCwd}/nested/nested-2`]
    ).toHaveBeenCalledTimes(1);
    expect(
      testExtendedTemplates[`${testCwd}/nested/nested-2`]
    ).toHaveBeenCalledWith({
      coatContext,
      config: { nested2: "config-value" },
    });

    expect(
      testExtendedTemplates[`${testCwd}/nested/nested-2/nested-2-A`]
    ).toHaveBeenCalledTimes(1);
    expect(
      testExtendedTemplates[`${testCwd}/nested/nested-2/nested-2-A`]
    ).toHaveBeenCalledWith({ coatContext, config: {} });

    expect(
      testExtendedTemplates[
        `${testCwd}/nested/nested-2/nested-2-A/nested-2-A-2`
      ]
    ).toHaveBeenCalledTimes(1);
    expect(
      testExtendedTemplates[
        `${testCwd}/nested/nested-2/nested-2-A/nested-2-A-2`
      ]
    ).toHaveBeenCalledWith({
      coatContext,
      config: { nested2A2: "config-value" },
    });
  });

  describe("template validation", () => {
    test("should not log any messages if there are no validation issues", async () => {
      const coatContext: CoatContext = {
        cwd: testCwd,
        coatManifest: getStrictCoatManifest({
          name: "testManifest",
          extends: ["template"],
        }),
        packageJson: {},
        coatGlobalLockfile: getStrictCoatGlobalLockfile({
          version: COAT_GLOBAL_LOCKFILE_VERSION,
        }),
        coatLocalLockfile: getStrictCoatLocalLockfile({
          version: COAT_LOCAL_LOCKFILE_VERSION,
        }),
      };

      gatherExtendedTemplates(coatContext);

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test("should log warnings before errors", async () => {
      const coatContext: CoatContext = {
        cwd: testCwd,
        coatManifest: getStrictCoatManifest({
          name: "testManifest",
          extends: ["template"],
        }),
        packageJson: {},
        coatGlobalLockfile: getStrictCoatGlobalLockfile({
          version: COAT_GLOBAL_LOCKFILE_VERSION,
        }),
        coatLocalLockfile: getStrictCoatLocalLockfile({
          version: COAT_LOCAL_LOCKFILE_VERSION,
        }),
      };

      validateCoatManifestMock.mockReturnValue([
        {
          type: ValidationIssueType.Error,
          message: "an error",
          propertyPath: ["a", "b"],
          shortMessage: "",
        },
        {
          type: ValidationIssueType.Error,
          message: "second error",
          propertyPath: ["a", "b", "c"],
          shortMessage: "",
        },
        {
          type: ValidationIssueType.Warning,
          message: "a warning",
          propertyPath: ["d"],
        },
      ] as ValidationIssue[]);

      expect(() =>
        gatherExtendedTemplates(coatContext)
      ).toThrowErrorMatchingInlineSnapshot(
        `"Validation of template "template" threw errors."`
      );

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const errorMessage = stripAnsi(consoleErrorSpy.mock.calls[0][0]);
      expect(errorMessage).toMatchInlineSnapshot(`
        "The extended template "template" has the following issues:

         WARNING  - a warning
         ERROR  - an error
         ERROR  - second error
        "
      `);
    });

    test("should throw if there is a validation error", async () => {
      const coatContext: CoatContext = {
        cwd: testCwd,
        coatManifest: getStrictCoatManifest({
          name: "testManifest",
          extends: ["template"],
        }),
        packageJson: {},
        coatGlobalLockfile: getStrictCoatGlobalLockfile({
          version: COAT_GLOBAL_LOCKFILE_VERSION,
        }),
        coatLocalLockfile: getStrictCoatLocalLockfile({
          version: COAT_LOCAL_LOCKFILE_VERSION,
        }),
      };

      validateCoatManifestMock.mockReturnValue([
        {
          type: ValidationIssueType.Error,
          message: "an error",
          propertyPath: ["a", "b"],
          shortMessage: "",
        },
      ] as ValidationIssue[]);

      expect(() =>
        gatherExtendedTemplates(coatContext)
      ).toThrowErrorMatchingInlineSnapshot(
        `"Validation of template "template" threw an error."`
      );

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const errorMessage = stripAnsi(consoleErrorSpy.mock.calls[0][0]);
      expect(errorMessage).toMatchInlineSnapshot(`
        "The extended template "template" has the following issue:

         ERROR  - an error
        "
      `);
    });

    test("should not throw an error if there are only warnings", async () => {
      const coatContext: CoatContext = {
        cwd: testCwd,
        coatManifest: getStrictCoatManifest({
          name: "testManifest",
          extends: ["template"],
        }),
        packageJson: {},
        coatGlobalLockfile: getStrictCoatGlobalLockfile({
          version: COAT_GLOBAL_LOCKFILE_VERSION,
        }),
        coatLocalLockfile: getStrictCoatLocalLockfile({
          version: COAT_LOCAL_LOCKFILE_VERSION,
        }),
      };

      validateCoatManifestMock.mockReturnValue([
        {
          type: ValidationIssueType.Warning,
          message: "a warning",
          propertyPath: ["d"],
        },
        {
          type: ValidationIssueType.Warning,
          message: "second warning",
          propertyPath: ["e"],
        },
      ] as ValidationIssue[]);

      gatherExtendedTemplates(coatContext);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const errorMessage = stripAnsi(consoleErrorSpy.mock.calls[0][0]);
      expect(errorMessage).toMatchInlineSnapshot(`
        "The extended template "template" has the following issues:

         WARNING  - a warning
         WARNING  - second warning
        "
      `);
    });
  });
});
