import { promises as fs } from "fs";
import path from "path";
import { runCli } from "../utils/run-cli";
import { PackageJson } from "type-fest";
import { CoatManifest } from "../../src/types/coat-manifest";
import { cleanupTmpDirs } from "../utils/get-tmp-dir";

jest.setTimeout(60000);

afterAll(() => {
  cleanupTmpDirs();
});

describe("coat create - project files", () => {
  describe("package.json", () => {
    describe("default-template", () => {
      let packageJson: PackageJson;

      beforeAll(async () => {
        const projectName = "project-name";
        const { cwd, task } = runCli([
          "create",
          "@coat/integration-test-template",
          projectName,
        ]);
        await task;

        const packageJsonRaw = await fs.readFile(
          path.join(cwd, projectName, "package.json"),
          "utf8"
        );
        packageJson = JSON.parse(packageJsonRaw);
      });

      test("should use the project name as the name field", () => {
        expect(packageJson.name).toBe("project-name");
      });

      test("should set the version to 1.0.0", () => {
        expect(packageJson.version).toBe("1.0.0");
      });

      test("should add the template as a devDependency", () => {
        expect(
          packageJson.devDependencies?.["@coat/integration-test-template"]
        ).toBe("2.1.0");
      });

      test("should add peerDependencies as devDependencies", () => {
        expect(packageJson.devDependencies?.["@coat/cli"]).toBe("0.0.2");
      });
    });

    test("should add the template with GitHub url as devDependency", async () => {
      const projectName = "project-name";
      const { cwd, task } = runCli([
        "create",
        "coat-dev/cli-integration-tests-template",
        projectName,
      ]);
      await task;

      const packageJsonRaw = await fs.readFile(
        path.join(cwd, projectName, "package.json"),
        "utf8"
      );
      const packageJson = JSON.parse(packageJsonRaw);
      expect(packageJson.devDependencies).toEqual({
        "@coat/integration-test-template":
          "github:coat-dev/cli-integration-tests-template",
        "@coat/cli": "0.0.2",
      });
    });
  });

  describe("coat.json", () => {
    describe("general", () => {
      let coatManifestRaw: string;
      let coatManifest: CoatManifest;

      beforeAll(async () => {
        const projectName = "project-name";
        const { cwd, task } = runCli([
          "create",
          "@coat/integration-test-template",
          projectName,
        ]);
        await task;

        coatManifestRaw = await fs.readFile(
          path.join(cwd, projectName, "coat.json"),
          "utf8"
        );
        coatManifest = JSON.parse(coatManifestRaw);
      });

      test("should use the project name as the name field", () => {
        expect(coatManifest.name).toBe("project-name");
      });

      test("should be formatted json output with two spaces and a trailing new line", () => {
        const formatted = `${JSON.stringify(coatManifest, null, 2)}\n`;
        expect(formatted).toBe(coatManifestRaw);
      });
    });

    test("should extend specified template name if no version specified", async () => {
      const { task, cwd } = runCli([
        "create",
        "@coat/integration-test-template",
        "project-name",
      ]);
      await task;
      const coatManifestRaw = await fs.readFile(
        path.join(cwd, "project-name", "coat.json"),
        "utf8"
      );
      const coatManifest = JSON.parse(coatManifestRaw);
      expect(coatManifest.extends).toBe("@coat/integration-test-template");
    });

    test("should extend template base name if a version is specified", async () => {
      const { task, cwd } = runCli([
        "create",
        "@coat/integration-test-template@2.1.0",
        "project-name",
      ]);
      await task;
      const coatManifestRaw = await fs.readFile(
        path.join(cwd, "project-name", "coat.json"),
        "utf8"
      );
      const coatManifest = JSON.parse(coatManifestRaw);
      expect(coatManifest.extends).toBe("@coat/integration-test-template");
    });

    test("should extend template name from package.json if GitHub URL is specified", async () => {
      const { task, cwd } = runCli([
        "create",
        "coat-dev/cli-integration-tests-template",
        "project-name",
      ]);
      await task;
      const coatManifestRaw = await fs.readFile(
        path.join(cwd, "project-name", "coat.json"),
        "utf8"
      );
      const coatManifest = JSON.parse(coatManifestRaw);
      expect(coatManifest.extends).toBe("@coat/integration-test-template");
    });
  });

  describe("other files", () => {
    let projectDir: string;

    beforeAll(async () => {
      const projectName = "project-name";
      const { cwd, task } = runCli([
        "create",
        "@coat/integration-test-template",
        projectName,
      ]);
      await task;

      projectDir = path.join(cwd, projectName);
    });

    test("should create a package-lock.json file", async () => {
      // Only check whether file exists, don't make any assumptions about
      // the contents of the lockfile
      const entries = await fs.readdir(projectDir);
      expect(entries.includes("package-lock.json")).toBe(true);
    });

    test("should install node_modules", async () => {
      // Only check whether the node_modules folder exists and is not empty.
      // There are no assumptions about the exact folder structure
      const entries = await fs.readdir(projectDir);
      expect(entries.includes("node_modules")).toBe(true);
      const nodeModuleEntries = await fs.readdir(
        path.join(projectDir, "node_modules")
      );
      expect(nodeModuleEntries.length).toBeTruthy();
    });
  });
});

export default {};
