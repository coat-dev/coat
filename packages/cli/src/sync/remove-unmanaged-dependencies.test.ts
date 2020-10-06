import {
  COAT_GLOBAL_LOCKFILE_VERSION,
  COAT_LOCAL_LOCKFILE_VERSION,
} from "../constants";
import {
  getStrictCoatGlobalLockfile,
  getStrictCoatLocalLockfile,
} from "../lockfiles/get-strict-coat-lockfiles";
import { CoatContext } from "../types/coat-context";
import { getStrictCoatManifest } from "../util/get-strict-coat-manifest";
import { removeUnmanagedDependencies } from "./remove-unmanaged-dependencies";

describe("sync/remove-unmanaged-dependencies", () => {
  test.each`
    dependencyGroup
    ${"dependencies"}
    ${"devDependencies"}
    ${"optionalDependencies"}
    ${"peerDependencies"}
  `(
    "should remove a dependency from $dependencyGroup if it is no longer a part of the templateDependencies",
    ({ dependencyGroup }) => {
      const currentDependencies = {
        dependencies: {},
        devDependencies: {},
        optionalDependencies: {},
        peerDependencies: {},
        [dependencyGroup]: {
          testDependency: "1.0.0",
        },
      };
      const templateDependencies = {
        dependencies: {},
        devDependencies: {},
        optionalDependencies: {},
        peerDependencies: {},
      };
      const testContext: CoatContext = {
        cwd: "test-cwd",
        coatManifest: getStrictCoatManifest({
          name: "test",
        }),
        packageJson: {},
        coatGlobalLockfile: getStrictCoatGlobalLockfile({
          version: COAT_GLOBAL_LOCKFILE_VERSION,
          dependencies: {
            [dependencyGroup]: ["testDependency"],
          },
        }),
        coatLocalLockfile: getStrictCoatLocalLockfile({
          version: COAT_LOCAL_LOCKFILE_VERSION,
        }),
      };

      expect(
        removeUnmanagedDependencies(
          currentDependencies,
          templateDependencies,
          testContext
        )
      ).toEqual({
        dependencies: {},
        devDependencies: {},
        optionalDependencies: {},
        peerDependencies: {},
      });
    }
  );

  test.each`
    dependencyGroup
    ${"dependencies"}
    ${"devDependencies"}
    ${"optionalDependencies"}
    ${"peerDependencies"}
  `(
    "should leave a dependency from $dependencyGroup alone if it is still a part of the templateDependencies",
    ({ dependencyGroup }) => {
      const currentDependencies = {
        dependencies: {},
        devDependencies: {},
        optionalDependencies: {},
        peerDependencies: {},
        [dependencyGroup]: {
          testDependency: "1.0.0",
        },
      };
      const templateDependencies = {
        dependencies: {},
        devDependencies: {},
        optionalDependencies: {},
        peerDependencies: {},
        [dependencyGroup]: {
          testDependency: "2.0.0",
        },
      };
      const testContext: CoatContext = {
        cwd: "test-cwd",
        coatManifest: getStrictCoatManifest({
          name: "test",
        }),
        packageJson: {},
        coatGlobalLockfile: getStrictCoatGlobalLockfile({
          version: COAT_GLOBAL_LOCKFILE_VERSION,
          dependencies: {
            [dependencyGroup]: ["testDependency"],
          },
        }),
        coatLocalLockfile: getStrictCoatLocalLockfile({
          version: COAT_LOCAL_LOCKFILE_VERSION,
        }),
      };

      expect(
        removeUnmanagedDependencies(
          currentDependencies,
          templateDependencies,
          testContext
        )
      ).toEqual({
        dependencies: {},
        devDependencies: {},
        optionalDependencies: {},
        peerDependencies: {},
        [dependencyGroup]: {
          testDependency: "1.0.0",
        },
      });
    }
  );

  test.each`
    dependencyGroup
    ${"dependencies"}
    ${"devDependencies"}
    ${"optionalDependencies"}
    ${"peerDependencies"}
  `(
    "should work for a dependency from $dependencyGroup that is no longer in the templateDependencies and also no longer a part of currentDependencies",
    ({ dependencyGroup }) => {
      const currentDependencies = {
        dependencies: {},
        devDependencies: {},
        optionalDependencies: {},
        peerDependencies: {},
      };
      const templateDependencies = {
        dependencies: {},
        devDependencies: {},
        optionalDependencies: {},
        peerDependencies: {},
      };
      const testContext: CoatContext = {
        cwd: "test-cwd",
        coatManifest: getStrictCoatManifest({
          name: "test",
        }),
        packageJson: {},
        coatGlobalLockfile: getStrictCoatGlobalLockfile({
          version: COAT_GLOBAL_LOCKFILE_VERSION,
          dependencies: {
            [dependencyGroup]: ["testDependency"],
          },
        }),
        coatLocalLockfile: getStrictCoatLocalLockfile({
          version: COAT_LOCAL_LOCKFILE_VERSION,
        }),
      };

      expect(
        removeUnmanagedDependencies(
          currentDependencies,
          templateDependencies,
          testContext
        )
      ).toEqual({
        dependencies: {},
        devDependencies: {},
        optionalDependencies: {},
        peerDependencies: {},
      });
    }
  );

  test("should remove unmanaged dependencies if multiple dependency groups are mixed together", () => {
    const currentDependencies = {
      dependencies: {
        oldDependency: "1.0.0",
        dependencyToBeRemoved: "1.0.0",
        templateDependency: "1.0.0",
      },
      devDependencies: {
        oldDevDependency: "1.0.0",
        devDependencyToBeRemoved: "1.0.0",
        templateDevDependency: "1.0.0",
      },
      optionalDependencies: {
        oldOptionalDependency: "1.0.0",
        optionalDependencyToBeRemoved: "1.0.0",
        templateOptionalDependency: "1.0.0",
      },
      peerDependencies: {
        oldPeerDependency: "1.0.0",
        peerDependencyToBeRemoved: "1.0.0",
        templatePeerDependency: "1.0.0",
      },
    };
    const templateDependencies = {
      dependencies: {
        templateDependency: "1.0.0",
      },
      devDependencies: {
        templateDevDependency: "1.0.0",
      },
      optionalDependencies: {
        templateOptionalDependency: "1.0.0",
      },
      peerDependencies: {
        templatePeerDependency: "1.0.0",
      },
    };
    const testContext: CoatContext = {
      cwd: "test-cwd",
      coatManifest: getStrictCoatManifest({
        name: "test",
      }),
      packageJson: {},
      coatGlobalLockfile: getStrictCoatGlobalLockfile({
        version: COAT_GLOBAL_LOCKFILE_VERSION,
        dependencies: {
          dependencies: ["dependencyToBeRemoved"],
          devDependencies: ["devDependencyToBeRemoved"],
          optionalDependencies: ["optionalDependencyToBeRemoved"],
          peerDependencies: ["peerDependencyToBeRemoved"],
        },
      }),
      coatLocalLockfile: getStrictCoatLocalLockfile({
        version: COAT_LOCAL_LOCKFILE_VERSION,
      }),
    };

    expect(
      removeUnmanagedDependencies(
        currentDependencies,
        templateDependencies,
        testContext
      )
    ).toEqual({
      dependencies: {
        oldDependency: "1.0.0",
        templateDependency: "1.0.0",
      },
      devDependencies: {
        oldDevDependency: "1.0.0",
        templateDevDependency: "1.0.0",
      },
      optionalDependencies: {
        oldOptionalDependency: "1.0.0",
        templateOptionalDependency: "1.0.0",
      },
      peerDependencies: {
        oldPeerDependency: "1.0.0",
        templatePeerDependency: "1.0.0",
      },
    });
  });
});
