import { promises as fs } from "fs";
import path from "path";
import fsExtra from "fs-extra";
import { CoatManifestFileType } from "../../src/types/coat-manifest-file";
import { runSyncTest, prepareCliTest } from "../utils/run-cli-test";
import { PACKAGE_JSON_FILENAME } from "../../src/constants";
import execa from "execa";
import { getPackageVersion } from "../utils/get-package-version";
import { runCli } from "../utils/run-cli";

describe("coat sync - dependencies", () => {
  const testPackagesPath = path.join(__dirname, "..", "utils", "test-packages");
  const localDependency1Path = path.join(
    testPackagesPath,
    "local-dependency-1"
  );

  test("should work with a template with empty dependency entries", async () => {
    const fileContent = "test\n";
    const filePath = "file.txt";
    const { cwd, task } = await runSyncTest({
      coatManifest: {
        name: "project",
        dependencies: {
          // dependencies & devDependencies are empty objects and should
          // not result in a property in package.json
          dependencies: {},
          devDependencies: {},
          // peerDependencies & optionalDependencies are absent and should
          // not result in a property in package.json
          // peerDependencies: {},
          // optionalDependencies: {},
        },
        files: [
          {
            content: fileContent,
            file: filePath,
            type: CoatManifestFileType.Text,
          },
        ],
      },
    });

    await task;

    const diskFileContent = await fs.readFile(path.join(cwd, filePath), "utf8");
    expect(diskFileContent).toBe(fileContent);

    const packageJsonContent = await fs.readFile(
      path.join(cwd, PACKAGE_JSON_FILENAME),
      "utf8"
    );
    expect(JSON.parse(packageJsonContent)).toEqual({
      name: "test-project",
      version: "1.0.0",
    });
  });

  test("should override existing dependencies and run install", async () => {
    const projectName = "test-project";
    const cwd = await prepareCliTest({
      coatManifest: {
        name: projectName,
        dependencies: {
          dependencies: {
            lodash: "4.0.0",
          },
        },
      },
      packageJson: {
        name: projectName,
        dependencies: {
          lodash: "3.0.0",
        },
      },
    });

    // Run npm install to install lodash@3.0.0 dependency
    await execa("npm", ["install"], { cwd });

    const lodashVersionBefore = await getPackageVersion("lodash", cwd);
    expect(lodashVersionBefore).toBe("3.0.0");

    const { task } = runCli(["sync"], { cwd });
    await task;

    const packageJsonContent = await fs.readFile(
      path.join(cwd, PACKAGE_JSON_FILENAME),
      "utf8"
    );
    expect(JSON.parse(packageJsonContent)).toEqual({
      name: projectName,
      dependencies: {
        lodash: "4.0.0",
      },
    });

    const lodashVersionAfter = await getPackageVersion("lodash", cwd);
    expect(lodashVersionAfter).toBe("4.0.0");
  });

  test.each`
    dependencyType            | expectNodeModules
    ${"dependencies"}         | ${true}
    ${"devDependencies"}      | ${true}
    ${"optionalDependencies"} | ${true}
    ${"peerDependencies"}     | ${false}
  `(
    "should add a new $dependencyType",
    async ({ dependencyType, expectNodeModules }) => {
      const projectName = "test-project";

      const { cwd, task } = await runSyncTest({
        coatManifest: {
          name: projectName,
          dependencies: {
            [dependencyType]: {
              "local-dependency-1": localDependency1Path,
            },
          },
        },
      });
      await task;

      const packageJsonContent = await fs.readFile(
        path.join(cwd, PACKAGE_JSON_FILENAME),
        "utf8"
      );
      expect(JSON.parse(packageJsonContent)).toEqual({
        name: projectName,
        version: "1.0.0",
        [dependencyType]: {
          "local-dependency-1": localDependency1Path,
        },
      });

      if (expectNodeModules) {
        // Verify that local dependency folder exists inside node_modules
        const statResult = await fs.stat(
          path.join(cwd, "node_modules", "local-dependency-1")
        );
        expect(statResult.isDirectory()).toBe(true);
      } else {
        try {
          await fs.stat(path.join(cwd, "node_modules"));
          throw new Error(
            "Error! node_modules folder should not have been created"
          );
        } catch (error) {
          expect(
            error.message.includes("ENOENT: no such file or directory,")
          ).toBe(true);
        }
      }
    }
  );

  test("should add multiple dependencies with different dependency types", async () => {
    const projectName = "test-project";
    const { cwd, task } = await runSyncTest({
      coatManifest: {
        name: projectName,
        dependencies: {
          dependencies: {
            "local-dependency": localDependency1Path,
          },
          devDependencies: {
            "local-dependency-dev": localDependency1Path,
          },
          optionalDependencies: {
            "local-dependency-optional": localDependency1Path,
          },
          peerDependencies: {
            "local-dependency-peer": localDependency1Path,
          },
        },
      },
    });
    await task;

    const packageJsonContent = await fs.readFile(
      path.join(cwd, PACKAGE_JSON_FILENAME),
      "utf8"
    );
    expect(JSON.parse(packageJsonContent)).toEqual({
      name: projectName,
      version: "1.0.0",
      dependencies: {
        "local-dependency": localDependency1Path,
      },
      devDependencies: {
        "local-dependency-dev": localDependency1Path,
      },
      optionalDependencies: {
        "local-dependency-optional": localDependency1Path,
      },
      peerDependencies: {
        "local-dependency-peer": localDependency1Path,
      },
    });

    const nodeModules = await fs.readdir(path.join(cwd, "node_modules"));
    expect(nodeModules).toContain("local-dependency");
    expect(nodeModules).toContain("local-dependency-dev");
    expect(nodeModules).toContain("local-dependency-optional");
    expect(nodeModules).not.toContain("local-dependency-peer");
  });

  test("should install dependencies when a dependency is removed", async () => {
    const projectName = "test-project";
    const cwd = await prepareCliTest({
      coatManifest: {
        name: projectName,
        extends: "./local-template-3",
      },
      packageJson: {
        name: projectName,
        dependencies: {
          "local-dependency-before": localDependency1Path,
        },
      },
    });
    await Promise.all([
      // Run npm install in project directory
      execa("npm", ["install"], { cwd }),
      // Copy local template into target directory
      fsExtra.copy(
        path.join(
          __dirname,
          "..",
          "utils",
          "test-packages",
          "local-template-3"
        ),
        path.join(cwd, "local-template-3")
      ),
    ]);

    // Ensure local dependency exists before
    const beforeStatResult = await fs.stat(
      path.join(cwd, "node_modules", "local-dependency-before")
    );
    expect(beforeStatResult.isDirectory()).toBe(true);

    // Run sync
    const { task } = runCli(["sync"], { cwd });
    await task;

    // Ensure that package.json is updated
    const packageJsonContent = await fs.readFile(
      path.join(cwd, PACKAGE_JSON_FILENAME),
      "utf8"
    );
    expect(JSON.parse(packageJsonContent)).toEqual({
      name: projectName,
      dependencies: {
        "local-dependency-after": localDependency1Path,
      },
    });

    // Ensure new local dependency directory exists and old one is deleted
    try {
      await fs.stat(path.join(cwd, "node_modules", "local-dependency-before"));
      throw new Error("Error! Old dependency directory should no longer exist");
    } catch (error) {
      expect(error.message.includes("ENOENT: no such file or directory,")).toBe(
        true
      );
    }
    const afterStatResult = await fs.stat(
      path.join(cwd, "node_modules", "local-dependency-after")
    );
    expect(afterStatResult.isDirectory()).toBe(true);
  });

  test("should keep existing dependencies", async () => {
    const localDependency2Path = path.join(
      testPackagesPath,
      "local-dependency-2"
    );
    const localDependency3Path = path.join(
      testPackagesPath,
      "local-dependency-3"
    );
    const localDependency4Path = path.join(
      testPackagesPath,
      "local-dependency-4"
    );
    const localDependency5Path = path.join(
      testPackagesPath,
      "local-dependency-5"
    );
    const localDependency6Path = path.join(
      testPackagesPath,
      "local-dependency-6"
    );
    const localDependency7Path = path.join(
      testPackagesPath,
      "local-dependency-7"
    );
    const localDependency8Path = path.join(
      testPackagesPath,
      "local-dependency-8"
    );

    const projectName = "test-project";
    const { cwd, task } = await runSyncTest({
      coatManifest: {
        name: projectName,
        dependencies: {
          dependencies: {
            oldDependencyToOverride: localDependency5Path,
          },
          devDependencies: {
            oldDevDependencyToOverride: localDependency6Path,
          },
          optionalDependencies: {
            oldOptionalDependencyToOverride: localDependency7Path,
          },
          peerDependencies: {
            oldPeerDependencyToOverride: localDependency8Path,
          },
        },
      },
      packageJson: {
        name: projectName,
        version: "1.0.0",
        dependencies: {
          oldDependency: localDependency1Path,
          oldDependencyToOverride: "*",
        },
        devDependencies: {
          oldDevDependency: localDependency2Path,
          oldDevDependencyToOverride: "*",
        },
        optionalDependencies: {
          oldOptionalDependency: localDependency3Path,
          oldOptionalDependencyToOverride: "*",
        },
        peerDependencies: {
          oldPeerDependency: localDependency4Path,
          oldPeerDependencyToOverride: "*",
        },
      },
    });
    await task;

    const packageJsonContent = await fs.readFile(
      path.join(cwd, PACKAGE_JSON_FILENAME),
      "utf8"
    );
    expect(JSON.parse(packageJsonContent)).toEqual({
      name: "test-project",
      version: "1.0.0",
      dependencies: {
        oldDependency: localDependency1Path,
        oldDependencyToOverride: localDependency5Path,
      },
      devDependencies: {
        oldDevDependency: localDependency2Path,
        oldDevDependencyToOverride: localDependency6Path,
      },
      optionalDependencies: {
        oldOptionalDependency: localDependency3Path,
        oldOptionalDependencyToOverride: localDependency7Path,
      },
      peerDependencies: {
        oldPeerDependency: localDependency4Path,
        oldPeerDependencyToOverride: localDependency8Path,
      },
    });
  });
});
