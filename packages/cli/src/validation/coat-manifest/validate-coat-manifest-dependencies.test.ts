/* eslint-disable @typescript-eslint/no-empty-function */
import chalk from "chalk";
import { CoatManifest } from "../../types/coat-manifest";
import { ValidationIssueType } from "../validation-issue";
import { validateCoatManifestDependencies } from "./validate-coat-manifest-dependencies";

describe("validation/coat-manifest/validate-coat-manifest-dependencies", () => {
  test("should return no issues for an empty object", () => {
    const dependencies: CoatManifest["dependencies"] = {};

    const issues = [...validateCoatManifestDependencies(dependencies)];

    expect(issues).toHaveLength(0);
  });

  test.each`
    dependencies                                   | description
    ${{ dependencies: {} }}                        | ${"empty dependencies"}
    ${{ dependencies: { dep: "^1.0.0" } }}         | ${"dependencies with entries"}
    ${{ devDependencies: {} }}                     | ${"empty devDependencies"}
    ${{ devDependencies: { dep: "^1.0.0" } }}      | ${"devDependencies with entries"}
    ${{ optionalDependencies: {} }}                | ${"empty optionalDependencies"}
    ${{ optionalDependencies: { dep: "^1.0.0" } }} | ${"optionalDependencies with entries"}
    ${{ peerDependencies: {} }}                    | ${"empty peerDependencies"}
    ${{ peerDependencies: { dep: "^1.0.0" } }}     | ${"peerDependencies with entries"}
  `(
    "should return no issues for a single valid dependency property - $description",
    ({ dependencies }) => {
      const issues = [...validateCoatManifestDependencies(dependencies)];

      expect(issues).toHaveLength(0);
    }
  );
  test("should return no issues for full valid dependency properties", () => {
    const dependencies: CoatManifest["dependencies"] = {
      dependencies: {
        dep: "^1.0.0",
      },
      devDependencies: {
        dep2: "^1.0.0",
      },
      optionalDependencies: {
        dep3: "^1.0.0",
      },
      peerDependencies: {
        dep4: "^1.0.0",
      },
    };

    const issues = [...validateCoatManifestDependencies(dependencies)];

    expect(issues).toHaveLength(0);
  });

  test.each`
    dependencies  | description
    ${"asdfsadf"} | ${"string"}
    ${123123}     | ${"number"}
    ${() => {}}   | ${"function"}
    ${true}       | ${"boolean"}
    ${[]}         | ${"array"}
    ${null}       | ${"null"}
  `(
    "should return an issue for an invalid prop type - $description",
    ({ dependencies }) => {
      const issues = [...validateCoatManifestDependencies(dependencies)];

      expect(issues).toHaveLength(1);
      expect(issues).toEqual([
        {
          type: ValidationIssueType.Error,
          message: chalk`{green dependencies:} must be an object.`,
          propertyPath: ["dependencies"],
          shortMessage: "must be an object.",
        },
      ]);
    }
  );

  test("should return a warning for unknown properties - with suggestion", () => {
    const dependencies: CoatManifest["dependencies"] = {
      // @ts-expect-error Typo in dependencies
      dependenccies: {
        dep: "^1.0.0",
      },
    };

    const issues = [...validateCoatManifestDependencies(dependencies)];

    expect(issues).toHaveLength(1);
    expect(issues).toEqual([
      {
        type: ValidationIssueType.Warning,
        message: chalk`{green dependencies.dependenccies:} Unknown property. Did you mean {magenta dependencies}?`,
        propertyPath: ["dependencies", "dependenccies"],
      },
    ]);
  });
  test("should return a warning for unknown properties - without suggestion", () => {
    const dependencies: CoatManifest["dependencies"] = {
      // @ts-expect-error Unknown property
      somethingElse: {
        dep: "^1.0.0",
      },
    };

    const issues = [...validateCoatManifestDependencies(dependencies)];

    expect(issues).toHaveLength(1);
    expect(issues).toEqual([
      {
        type: ValidationIssueType.Warning,
        message: chalk`{green dependencies.somethingElse:} Unknown property.`,
        propertyPath: ["dependencies", "somethingElse"],
      },
    ]);
  });

  const dependencyTypes = [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
  ];
  for (const dependencyType of dependencyTypes) {
    describe(dependencyType, () => {
      test.each`
        deps          | description
        ${"asdfsadf"} | ${"string"}
        ${123123}     | ${"number"}
        ${() => {}}   | ${"function"}
        ${true}       | ${"boolean"}
        ${[]}         | ${"array"}
        ${null}       | ${"null"}
      `(
        `should return an issue if ${dependencyType} is not an object - $description`,
        ({ deps }) => {
          const dependencies: CoatManifest["dependencies"] = {
            [dependencyType]: deps,
          };

          const issues = [...validateCoatManifestDependencies(dependencies)];

          expect(issues).toHaveLength(1);
          expect(issues).toEqual([
            {
              type: ValidationIssueType.Error,
              message: chalk`{green dependencies.${dependencyType}:} must be an object.`,
              propertyPath: ["dependencies", dependencyType],
              shortMessage: "must be an object.",
            },
          ]);
        }
      );
    });

    test("should return an issue for an empty dependency name", () => {
      const dependencies: CoatManifest["dependencies"] = {
        [dependencyType]: {
          "": "^1.0.0",
        },
      };

      const issues = [...validateCoatManifestDependencies(dependencies)];

      expect(issues).toHaveLength(1);
      expect(issues).toEqual([
        {
          type: ValidationIssueType.Error,
          message: chalk`{green dependencies.${dependencyType}:} must not contain an empty dependency name.`,
          propertyPath: ["dependencies", dependencyType],
          shortMessage: "must not contain an empty dependency name.",
        },
      ]);
    });

    test("should return an issue for empty dependency versions", () => {
      const dependencies: CoatManifest["dependencies"] = {
        [dependencyType]: {
          a: "",
          b: "^1.0.0",
          "@scoped/dependency": "",
        },
      };

      const issues = [...validateCoatManifestDependencies(dependencies)];

      expect(issues).toHaveLength(2);
      expect(issues).toContainEqual({
        type: ValidationIssueType.Error,
        message: chalk`{green dependencies.${dependencyType}.a:} dependency version must not be empty.`,
        propertyPath: ["dependencies", dependencyType, "a"],
        shortMessage: "dependency version must not be empty.",
      });
      expect(issues).toContainEqual({
        type: ValidationIssueType.Error,
        message: chalk`{green dependencies.${dependencyType}['@scoped/dependency']:} dependency version must not be empty.`,
        propertyPath: ["dependencies", dependencyType, "@scoped/dependency"],
        shortMessage: "dependency version must not be empty.",
      });
    });
  }
});
