import { gatherExtendedTemplates } from "./gather-extended-templates";
import resolveFrom from "resolve-from";
import { CoatContext } from "../types/coat-context";
import importFrom from "import-from";
import { CoatManifestStrict } from "../types/coat-manifest";

jest.mock("resolve-from").mock("import-from");

const testCwd = "test";

const resolveFromMock = (resolveFrom as unknown) as jest.Mock;
resolveFromMock.mockImplementation(
  (cwd, template) => `${cwd}/${template}/index.js`
);

const testExtendedTemplates: {
  [template: string]: CoatManifestStrict | (() => CoatManifestStrict);
} = {
  [`${testCwd}/template`]: {
    name: "template",
    dependencies: {},
    extends: [],
    files: [],
    scripts: [],
  },
  [`${testCwd}/template-fn-result`]: {
    name: "template-fn",
    dependencies: {},
    extends: [],
    files: [],
    scripts: [],
  },
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
  [`${testCwd}/nested`]: {
    name: "nested",
    extends: ["nested-1", "nested-2", "nested-3"],
    dependencies: {},
    files: [],
    scripts: [],
  },
  [`${testCwd}/nested/nested-1`]: {
    name: "nested-1",
    dependencies: {},
    extends: ["nested-1-A", "nested-1-B"],
    files: [],
    scripts: [],
  },
  [`${testCwd}/nested/nested-1/nested-1-A-result`]: {
    name: "nested-1-A",
    dependencies: {},
    extends: [],
    files: [],
    scripts: [],
  },
  [`${testCwd}/nested/nested-1/nested-1-A`]: jest.fn<CoatManifestStrict, []>(
    () =>
      testExtendedTemplates[
        `${testCwd}/nested/nested-1/nested-1-A-result`
      ] as CoatManifestStrict
  ),
  [`${testCwd}/nested/nested-1/nested-1-B`]: {
    name: "nested-1-B",
    dependencies: {},
    extends: [],
    files: [],
    scripts: [],
  },
  [`${testCwd}/nested/nested-2-result`]: {
    name: "nested-2",
    dependencies: {},
    extends: ["nested-2-A", "nested-2-B", "nested-common-template"],
    files: [],
    scripts: [],
  },
  [`${testCwd}/nested/nested-2`]: jest.fn<CoatManifestStrict, []>(
    () =>
      testExtendedTemplates[
        `${testCwd}/nested/nested-2-result`
      ] as CoatManifestStrict
  ),
  [`${testCwd}/nested/nested-2/nested-2-A-result`]: {
    name: "nested-2-A",
    dependencies: {},
    extends: ["nested-2-A-1", "nested-2-A-2"],
    files: [],
    scripts: [],
  },
  [`${testCwd}/nested/nested-2/nested-2-A`]: jest.fn<CoatManifestStrict, []>(
    () =>
      testExtendedTemplates[
        `${testCwd}/nested/nested-2/nested-2-A-result`
      ] as CoatManifestStrict
  ),
  [`${testCwd}/nested/nested-2/nested-2-A/nested-2-A-1`]: {
    name: "nested-2-A-1",
    dependencies: {},
    extends: [],
    files: [],
    scripts: [],
  },
  [`${testCwd}/nested/nested-2/nested-2-A/nested-2-A-2-result`]: {
    name: "nested-2-A-2",
    dependencies: {},
    extends: [],
    files: [],
    scripts: [],
  },
  [`${testCwd}/nested/nested-2/nested-2-A/nested-2-A-2`]: jest.fn<
    CoatManifestStrict,
    []
  >(
    () =>
      testExtendedTemplates[
        `${testCwd}/nested/nested-2/nested-2-A/nested-2-A-2-result`
      ] as CoatManifestStrict
  ),
  [`${testCwd}/nested/nested-2/nested-2-B`]: {
    name: "nested-2-B",
    dependencies: {},
    extends: ["nested-common-template"],
    files: [],
    scripts: [],
  },
  [`${testCwd}/nested/nested-2/nested-2-B/nested-common-template`]: {
    name: "nested-common-template",
    dependencies: {
      dependencies: {
        "from-2-B": "^1.0.0",
      },
    },
    extends: [],
    files: [],
    scripts: [],
  },
  [`${testCwd}/nested/nested-2/nested-common-template`]: {
    name: "nested-common-template",
    dependencies: {
      dependencies: {
        "from-2": "^1.0.0",
      },
    },
    extends: [],
    files: [],
    scripts: [],
  },
  [`${testCwd}/nested/nested-3`]: {
    name: "nested-3",
    dependencies: {},
    extends: [],
    files: [],
    scripts: [],
  },
};
const importFromMock = (importFrom as unknown) as jest.Mock;
importFromMock.mockImplementation((cwd, template) => {
  return testExtendedTemplates[`${cwd}/${template}`];
});

describe("sync/gather-extended-templates", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should retrieve a single extended template exporting a manifest", () => {
    const coatContext: CoatContext = {
      cwd: testCwd,
      coatManifest: {
        name: "testManifest",
        extends: ["template"],
        dependencies: {},
        files: [],
        scripts: [],
      },
      packageJson: {},
      coatLockfile: undefined,
    };
    const templates = gatherExtendedTemplates(coatContext);
    expect(templates).toEqual([testExtendedTemplates[`${testCwd}/template`]]);
  });

  test("should retrieve a single extended template exporting a function", () => {
    const coatContext: CoatContext = {
      cwd: testCwd,
      coatManifest: {
        name: "testManifest",
        extends: ["template-fn"],
        dependencies: {},
        files: [],
        scripts: [],
      },
      packageJson: {},
      coatLockfile: undefined,
    };
    const templates = gatherExtendedTemplates(coatContext);
    expect(templates).toEqual([
      testExtendedTemplates[`${testCwd}/template-fn-result`],
    ]);
  });

  test("should call templates that export functions with the coatContext", () => {
    const coatContext: CoatContext = {
      cwd: testCwd,
      coatManifest: {
        name: "testManifest",
        extends: ["template-fn"],
        dependencies: {},
        files: [],
        scripts: [],
      },
      packageJson: {},
      coatLockfile: undefined,
    };

    gatherExtendedTemplates(coatContext);

    expect(
      testExtendedTemplates[`${testCwd}/template-fn`]
    ).toHaveBeenCalledTimes(1);
    expect(
      testExtendedTemplates[`${testCwd}/template-fn`]
    ).toHaveBeenCalledWith(coatContext);
  });

  test("should resolve nested templates from their own directory to allow for multiple versions of a specific template", () => {
    const coatContext: CoatContext = {
      cwd: testCwd,
      coatManifest: {
        name: "testManifest",
        extends: ["nested"],
        dependencies: {},
        files: [],
        scripts: [],
      },
      packageJson: {},
      coatLockfile: undefined,
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

  test("should call nested templates that export a function with the coat context", () => {
    const coatContext: CoatContext = {
      cwd: testCwd,
      coatManifest: {
        name: "testManifest",
        extends: ["nested"],
        dependencies: {},
        files: [],
        scripts: [],
      },
      packageJson: {},
      coatLockfile: undefined,
    };

    gatherExtendedTemplates(coatContext);

    expect(
      testExtendedTemplates[`${testCwd}/nested/nested-1/nested-1-A`]
    ).toHaveBeenCalledTimes(1);
    expect(
      testExtendedTemplates[`${testCwd}/nested/nested-1/nested-1-A`]
    ).toHaveBeenCalledWith(coatContext);

    expect(
      testExtendedTemplates[`${testCwd}/nested/nested-2`]
    ).toHaveBeenCalledTimes(1);
    expect(
      testExtendedTemplates[`${testCwd}/nested/nested-2`]
    ).toHaveBeenCalledWith(coatContext);

    expect(
      testExtendedTemplates[`${testCwd}/nested/nested-2/nested-2-A`]
    ).toHaveBeenCalledTimes(1);
    expect(
      testExtendedTemplates[`${testCwd}/nested/nested-2/nested-2-A`]
    ).toHaveBeenCalledWith(coatContext);

    expect(
      testExtendedTemplates[
        `${testCwd}/nested/nested-2/nested-2-A/nested-2-A-2`
      ]
    ).toHaveBeenCalledTimes(1);
    expect(
      testExtendedTemplates[
        `${testCwd}/nested/nested-2/nested-2-A/nested-2-A-2`
      ]
    ).toHaveBeenCalledWith(coatContext);
  });
});
