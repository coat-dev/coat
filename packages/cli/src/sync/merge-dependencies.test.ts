import { mergeDependencies } from "./merge-dependencies";

describe("sync/merge-dependencies", () => {
  test("should return empty dependency properties from an empty list", () => {
    const result = mergeDependencies([]);
    expect(result).toEqual({
      dependencies: {},
      devDependencies: {},
      optionalDependencies: {},
      peerDependencies: {},
    });
  });

  test("should return empty dependencies from empty dependency groups", () => {
    const result = mergeDependencies([
      {
        dependencies: {},
        devDependencies: {},
        optionalDependencies: {},
        peerDependencies: {},
      },
      {
        dependencies: {},
        devDependencies: {},
        optionalDependencies: {},
        peerDependencies: {},
      },
    ]);
    expect(result).toEqual({
      dependencies: {},
      devDependencies: {},
      optionalDependencies: {},
      peerDependencies: {},
    });
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
        {
          dependencies: {},
          devDependencies: {},
          optionalDependencies: {},
          peerDependencies: {},
        },
        {
          dependencies: {},
          devDependencies: {},
          optionalDependencies: {},
          peerDependencies: {},
          [dependencyGroup]: {
            lodash: "^1.0.0",
          },
        },
        {
          dependencies: {},
          devDependencies: {},
          optionalDependencies: {},
          peerDependencies: {},
        },
      ]);
      expect(result).toEqual(
        expect.objectContaining({
          [dependencyGroup]: {
            lodash: "^1.0.0",
          },
        })
      );
    });

    test(`should override dependencies if a previous version does not satisfy the version range (${dependencyGroup})`, () => {
      const result = mergeDependencies([
        {
          dependencies: {},
          devDependencies: {},
          optionalDependencies: {},
          peerDependencies: {},
          [dependencyGroup]: {
            lodash: "^1.0.1",
          },
        },
        {
          dependencies: {},
          devDependencies: {},
          optionalDependencies: {},
          peerDependencies: {},
          [dependencyGroup]: {
            lodash: "^1.0.2",
          },
        },
      ]);
      expect(result).toEqual(
        expect.objectContaining({
          [dependencyGroup]: {
            lodash: "^1.0.2",
          },
        })
      );
    });

    test(`should keep previous version if version range satisfies new version range (${dependencyGroup})`, () => {
      const result = mergeDependencies([
        {
          dependencies: {},
          devDependencies: {},
          optionalDependencies: {},
          peerDependencies: {},
          [dependencyGroup]: {
            lodash: "^1.10.1",
          },
        },
        {
          dependencies: {},
          devDependencies: {},
          optionalDependencies: {},
          peerDependencies: {},
          [dependencyGroup]: {
            lodash: "^1.0.0",
          },
        },
      ]);
      expect(result).toEqual(
        expect.objectContaining({
          [dependencyGroup]: {
            lodash: "^1.10.1",
          },
        })
      );
    });

    test(`should overwrite git based dependencies (${dependencyGroup})`, () => {
      const result = mergeDependencies([
        {
          dependencies: {},
          devDependencies: {},
          optionalDependencies: {},
          peerDependencies: {},
        },
        {
          dependencies: {},
          devDependencies: {},
          optionalDependencies: {},
          peerDependencies: {},
          [dependencyGroup]: {
            lodash: "git+https://github.com/lodash/lodash.git",
            lodash2:
              "git+https://github.com/lodash/lodash.git#74b09d6272354b804dc9fa9f0703c566736cf8f5",
          },
        },
        {
          dependencies: {},
          devDependencies: {},
          optionalDependencies: {},
          peerDependencies: {},
          [dependencyGroup]: {
            lodash: "^1.0.0",
            lodash2: "^1.0.1",
          },
        },
      ]);
      expect(result).toEqual(
        expect.objectContaining({
          [dependencyGroup]: {
            lodash: "^1.0.0",
            lodash2: "^1.0.1",
          },
        })
      );
    });

    test(`should let git dependencies override previous dependencies (${dependencyGroup})`, () => {
      const result = mergeDependencies([
        {
          dependencies: {},
          devDependencies: {},
          optionalDependencies: {},
          peerDependencies: {},
        },
        {
          dependencies: {},
          devDependencies: {},
          optionalDependencies: {},
          peerDependencies: {},
          [dependencyGroup]: {
            lodash: "^1.0.0",
            lodash2: "^1.0.1",
          },
        },
        {
          dependencies: {},
          devDependencies: {},
          optionalDependencies: {},
          peerDependencies: {},
          [dependencyGroup]: {
            lodash: "git+https://github.com/lodash/lodash.git",
            lodash2:
              "git+https://github.com/lodash/lodash.git#74b09d6272354b804dc9fa9f0703c566736cf8f5",
          },
        },
      ]);
      expect(result).toEqual(
        expect.objectContaining({
          [dependencyGroup]: {
            lodash: "git+https://github.com/lodash/lodash.git",
            lodash2:
              "git+https://github.com/lodash/lodash.git#74b09d6272354b804dc9fa9f0703c566736cf8f5",
          },
        })
      );
    });

    test(`should override file path based dependencies (${dependencyGroup})`, () => {
      const result = mergeDependencies([
        {
          dependencies: {},
          devDependencies: {},
          optionalDependencies: {},
          peerDependencies: {},
          [dependencyGroup]: {
            lodash: "file:../../packages/lodash",
          },
        },
        {
          dependencies: {},
          devDependencies: {},
          optionalDependencies: {},
          peerDependencies: {},
          [dependencyGroup]: {
            lodash: "^1.0.0",
          },
        },
      ]);
      expect(result).toEqual(
        expect.objectContaining({
          [dependencyGroup]: {
            lodash: "^1.0.0",
          },
        })
      );
    });

    test(`should work with file path based dependencies and let them override previous dependencies (${dependencyGroup})`, () => {
      const result = mergeDependencies([
        {
          dependencies: {},
          devDependencies: {},
          optionalDependencies: {},
          peerDependencies: {},
          [dependencyGroup]: {
            lodash: "^1.0.0",
          },
        },
        {
          dependencies: {},
          devDependencies: {},
          optionalDependencies: {},
          peerDependencies: {},
          [dependencyGroup]: {
            lodash: "file:../../packages/lodash",
          },
        },
      ]);
      expect(result).toEqual(
        expect.objectContaining({
          [dependencyGroup]: {
            lodash: "file:../../packages/lodash",
          },
        })
      );
    });

    test(`should work with pre-release versions and let them override existing dependencies (${dependencyGroup})`, () => {
      const result = mergeDependencies([
        {
          dependencies: {},
          devDependencies: {},
          optionalDependencies: {},
          peerDependencies: {},
          [dependencyGroup]: {
            lodash: "^1.0.0",
          },
        },
        {
          dependencies: {},
          devDependencies: {},
          optionalDependencies: {},
          peerDependencies: {},
          [dependencyGroup]: {
            lodash: "^2.0.0-alpha.1",
          },
        },
      ]);
      expect(result).toEqual(
        expect.objectContaining({
          [dependencyGroup]: {
            lodash: "^2.0.0-alpha.1",
          },
        })
      );
    });

    test("should work with pre-release versions and be overridden by a higher stable version", () => {
      const result = mergeDependencies([
        {
          dependencies: {},
          devDependencies: {},
          optionalDependencies: {},
          peerDependencies: {},
          [dependencyGroup]: {
            lodash: "^2.0.0-alpha.1",
          },
        },
        {
          dependencies: {},
          devDependencies: {},
          optionalDependencies: {},
          peerDependencies: {},
          [dependencyGroup]: {
            lodash: "^2.0.0",
          },
        },
      ]);
      expect(result).toEqual(
        expect.objectContaining({
          [dependencyGroup]: {
            lodash: "^2.0.0",
          },
        })
      );
    });
  });
});
