import fs from "fs-extra";
import path from "path";
import { vol } from "memfs";
import stripAnsi from "strip-ansi";
import { getContext } from "./get-context";
import { PACKAGE_JSON_FILENAME } from "../constants";
import { validateCoatManifest } from "../validation/coat-manifest";
import {
  ValidationIssue,
  ValidationIssueType,
} from "../validation/validation-issue";

jest.mock("fs").mock("../validation/coat-manifest");

const validateCoatManifestMock = validateCoatManifest as unknown as jest.Mock;

const consoleErrorSpy = jest.spyOn(console, "error");

describe("util/get-context", () => {
  beforeEach(() => {
    validateCoatManifestMock.mockReturnValue([]);
    consoleErrorSpy.mockImplementation(() => {
      // Empty mock function
    });
  });

  afterEach(() => {
    vol.reset();
    jest.resetAllMocks();
  });

  async function createTestContextFiles(
    cwd: string,
    coatManifest: unknown,
    packageJson: unknown
  ): Promise<void> {
    await Promise.all([
      fs.outputFile(
        path.join(cwd, "coat.json"),
        JSON.stringify(coatManifest, null, 2)
      ),
      fs.outputFile(
        path.join(cwd, "package.json"),
        JSON.stringify(packageJson)
      ),
    ]);
  }

  test("should read and parse the coatManifest in a directory", async () => {
    const testCwd = "/test";
    const coatManifest = {
      name: "hi",
      dependencies: {
        dependencies: {},
        devDependencies: {},
        optionalDependencies: {},
        peerDependencies: {},
      },
      extends: [],
      files: [],
      scripts: [],
      setup: {
        global: {
          tasks: [],
          files: [],
        },
        local: {
          tasks: [],
          files: [],
        },
      },
    };
    const packageJson = {
      name: "hi",
      version: "1.0.0",
    };
    await createTestContextFiles(testCwd, coatManifest, packageJson);
    const context = await getContext(testCwd);
    expect(context.coatManifest).toEqual(coatManifest);
  });

  test("should read and parse the packageJson in a directory", async () => {
    const testCwd = "/test";
    const coatManifest = {
      name: "hi",
      dependencies: {},
      extends: [],
      files: [],
      scripts: [],
    };
    const packageJson = {
      name: "hi",
      version: "1.0.0",
    };
    await createTestContextFiles(testCwd, coatManifest, packageJson);
    const context = await getContext(testCwd);
    expect(context.packageJson).toEqual(packageJson);
  });

  test("should convert coat manifest into strict manifest", async () => {
    const testCwd = "/test";
    const coatManifest = {
      name: "hi",
    };
    const packageJson = {
      name: "hi",
      version: "1.0.0",
    };
    await createTestContextFiles(testCwd, coatManifest, packageJson);
    const context = await getContext(testCwd);
    expect(context.coatManifest).toEqual({
      name: "hi",
      scripts: [],
      dependencies: {
        dependencies: {},
        devDependencies: {},
        optionalDependencies: {},
        peerDependencies: {},
      },
      extends: [],
      files: [],
      setup: [],
    });
  });

  test("should include cwd in result object", async () => {
    const testCwd = "/test";
    const coatManifest = {
      name: "hi",
      dependencies: {},
      extends: [],
      files: [],
      scripts: [],
    };
    const packageJson = {
      name: "hi",
      version: "1.0.0",
    };
    await createTestContextFiles(testCwd, coatManifest, packageJson);
    const context = await getContext(testCwd);
    expect(context.cwd).toEqual(testCwd);
  });

  test("should throw error if package.json cannot be parsed", async () => {
    const testCwd = "/test";
    const coatManifest = {
      name: "hi",
      dependencies: {},
      extends: [],
      files: [],
      scripts: [],
    };
    const packageJson = {
      name: "hi",
      version: "1.0.0",
    };
    await createTestContextFiles(testCwd, coatManifest, packageJson);

    // Overwrite package.json with an invalid JSON string
    await fs.writeFile(path.join(testCwd, PACKAGE_JSON_FILENAME), "undefined");

    await expect(() => getContext(testCwd)).rejects.toHaveProperty(
      "message",
      "Cannot read or parse package.json"
    );
  });

  describe("coat manifest validation", () => {
    test("should not log any messages if there are no validation issues", async () => {
      const testCwd = "/test";
      const coatManifest = {
        name: "hi",
      };
      const packageJson = {
        name: "hi",
        version: "1.0.0",
      };
      await createTestContextFiles(testCwd, coatManifest, packageJson);
      await getContext(testCwd);

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test("should log warnings before errors", async () => {
      const testCwd = "/test";
      const coatManifest = {
        name: "hi",
      };
      const packageJson = {
        name: "hi",
        version: "1.0.0",
      };
      await createTestContextFiles(testCwd, coatManifest, packageJson);

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

      await expect(() => getContext(testCwd)).rejects.toMatchInlineSnapshot(
        `[Error: Validation of coat manifest threw errors.]`
      );

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const errorMessage = stripAnsi(consoleErrorSpy.mock.calls[0][0]);
      expect(errorMessage).toMatchInlineSnapshot(`
        "The coat manifest file (coat.json) has the following issues:

         WARNING  - a warning
         ERROR  - an error
         ERROR  - second error
        "
      `);
    });

    test("should not throw an error if there are only warnings", async () => {
      const testCwd = "/test";
      const coatManifest = {
        name: "hi",
      };
      const packageJson = {
        name: "hi",
        version: "1.0.0",
      };
      await createTestContextFiles(testCwd, coatManifest, packageJson);

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

      await getContext(testCwd);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const errorMessage = stripAnsi(consoleErrorSpy.mock.calls[0][0]);
      expect(errorMessage).toMatchInlineSnapshot(`
        "The coat manifest file (coat.json) has the following issues:

         WARNING  - a warning
         WARNING  - second warning
        "
      `);
    });

    test("should show a code frame if there is only a single error", async () => {
      const testCwd = "/test";
      const coatManifest = {
        name: "hi",
      };
      const packageJson = {
        name: "hi",
        version: "1.0.0",
      };
      await createTestContextFiles(testCwd, coatManifest, packageJson);

      validateCoatManifestMock.mockReturnValue([
        {
          type: ValidationIssueType.Error,
          message: "name is wrong",
          propertyPath: ["name"],
          shortMessage: "name is wrong",
        },
      ] as ValidationIssue[]);

      await expect(() => getContext(testCwd)).rejects.toMatchInlineSnapshot(
        `[Error: Validation of coat manifest threw an error.]`
      );

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const errorMessage = stripAnsi(consoleErrorSpy.mock.calls[0][0]);
      expect(errorMessage).toMatchInlineSnapshot(`
        "The coat manifest file (coat.json) has the following issue:

         ERROR  - name is wrong

          1 | {
        > 2 |   "name": "hi"
            |   ^^^^^^^^^^^^ name is wrong
          3 | }
        "
      `);
    });
  });
});
