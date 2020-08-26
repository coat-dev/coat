import { mergeDependencies } from "./merge-dependencies";

describe("sync/merge-dependencies", () => {
  test("should return empty dependencies from empty list", () => {
    const result = mergeDependencies([]);
    expect(result).toEqual({});
  });

  test("should return empty dependencies from empty dependencies objects", () => {
    const result = mergeDependencies([{}, {}]);
    expect(result).toEqual({});
  });

  test("should return empty dependencies from empty dependency groups", () => {
    const result = mergeDependencies([
      {},
      {
        dependencies: {},
        devDependencies: {},
        optionalDependencies: {},
        peerDependencies: {},
      },
    ]);
    expect(result).toEqual({});
  });

  // Tests should be done for all four dependency groups
  describe.each`
    dependencyGroup
    ${"dependencies"}
    ${"devDependencies"}
    ${"optionalDependencies"}
    ${"peerDependencies"}
  `("dependency group tests: $dependencyGroup", ({ dependencyGroup }) => {
    test(`should add new dependencies (${dependencyGroup})`, () => {
      const result = mergeDependencies([
        {},
        {
          [dependencyGroup]: {
            lodash: "^1.0.0",
          },
        },
        {},
      ]);
      expect(result).toEqual({
        [dependencyGroup]: {
          lodash: "^1.0.0",
        },
      });
    });

    test(`should override dependencies if a previous version does not satisfy the version range (${dependencyGroup})`, () => {
      const result = mergeDependencies([
        {
          [dependencyGroup]: {
            lodash: "^1.0.1",
          },
        },
        {
          [dependencyGroup]: {
            lodash: "^1.0.2",
          },
        },
      ]);
      expect(result).toEqual({
        [dependencyGroup]: {
          lodash: "^1.0.2",
        },
      });
    });

    test(`should keep previous version if version range satisfies new version range (${dependencyGroup})`, () => {
      const result = mergeDependencies([
        {
          [dependencyGroup]: {
            lodash: "^1.10.1",
          },
        },
        {
          [dependencyGroup]: {
            lodash: "^1.0.0",
          },
        },
      ]);
      expect(result).toEqual({
        [dependencyGroup]: {
          lodash: "^1.10.1",
        },
      });
    });

    test(`should overwrite git based dependencies (${dependencyGroup})`, () => {
      const result = mergeDependencies([
        {},
        {
          [dependencyGroup]: {
            lodash: "git+https://github.com/lodash/lodash.git",
            lodash2:
              "git+https://github.com/lodash/lodash.git#74b09d6272354b804dc9fa9f0703c566736cf8f5",
          },
        },
        {
          [dependencyGroup]: {
            lodash: "^1.0.0",
            lodash2: "^1.0.1",
          },
        },
      ]);
      expect(result).toEqual({
        [dependencyGroup]: {
          lodash: "^1.0.0",
          lodash2: "^1.0.1",
        },
      });
    });

    test(`should let git dependencies override previous dependencies (${dependencyGroup})`, () => {
      const result = mergeDependencies([
        {},
        {
          [dependencyGroup]: {
            lodash: "^1.0.0",
            lodash2: "^1.0.1",
          },
        },
        {
          [dependencyGroup]: {
            lodash: "git+https://github.com/lodash/lodash.git",
            lodash2:
              "git+https://github.com/lodash/lodash.git#74b09d6272354b804dc9fa9f0703c566736cf8f5",
          },
        },
      ]);
      expect(result).toEqual({
        [dependencyGroup]: {
          lodash: "git+https://github.com/lodash/lodash.git",
          lodash2:
            "git+https://github.com/lodash/lodash.git#74b09d6272354b804dc9fa9f0703c566736cf8f5",
        },
      });
    });

    test(`should override file path based dependencies (${dependencyGroup})`, () => {
      const result = mergeDependencies([
        {
          [dependencyGroup]: {
            lodash: "file:../../packages/lodash",
          },
        },
        {
          [dependencyGroup]: {
            lodash: "^1.0.0",
          },
        },
      ]);
      expect(result).toEqual({
        [dependencyGroup]: {
          lodash: "^1.0.0",
        },
      });
    });

    test(`should work with file path based dependencies and let them override previous dependencies (${dependencyGroup})`, () => {
      const result = mergeDependencies([
        {
          [dependencyGroup]: {
            lodash: "^1.0.0",
          },
        },
        {
          [dependencyGroup]: {
            lodash: "file:../../packages/lodash",
          },
        },
      ]);
      expect(result).toEqual({
        [dependencyGroup]: {
          lodash: "file:../../packages/lodash",
        },
      });
    });

    test(`should work with pre-release versions and let them override existing dependencies (${dependencyGroup})`, () => {
      const result = mergeDependencies([
        {
          [dependencyGroup]: {
            lodash: "^1.0.0",
          },
        },
        {
          [dependencyGroup]: {
            lodash: "^2.0.0-alpha.1",
          },
        },
      ]);
      expect(result).toEqual({
        [dependencyGroup]: {
          lodash: "^2.0.0-alpha.1",
        },
      });
    });

    test("should work with pre-release versions and be overriden by a higher stable version", () => {
      const result = mergeDependencies([
        {
          [dependencyGroup]: {
            lodash: "^2.0.0-alpha.1",
          },
        },
        {
          [dependencyGroup]: {
            lodash: "^2.0.0",
          },
        },
      ]);
      expect(result).toEqual({
        [dependencyGroup]: {
          lodash: "^2.0.0",
        },
      });
    });
  });
});
