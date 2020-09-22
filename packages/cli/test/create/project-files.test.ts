import { promises as fs } from "fs";
import path from "path";
import { runCli } from "../utils/run-cli";

describe("coat create - project files", () => {
  describe("package.json", () => {
    test("default-template", async () => {
      const projectName = "project-name";
      const { cwd, task } = runCli([
        "create",
        "@coat/e2e-test-template",
        projectName,
      ]);
      await task;

      const packageJsonRaw = await fs.readFile(
        path.join(cwd, projectName, "package.json"),
        "utf8"
      );
      const packageJson = JSON.parse(packageJsonRaw);

      // Should use the project name as the name field
      expect(packageJson.name).toBe("project-name");

      // Should set the version to 1.0.0
      expect(packageJson.version).toBe("1.0.0");

      // Should add the template as a devDependency
      expect(packageJson.devDependencies?.["@coat/e2e-test-template"]).toBe(
        "2.0.0"
      );

      // should add peerDependencies as devDependencies
      expect(packageJson.devDependencies?.["no-op"]).toBe("^1.0.3");
    });

    test("should add the template with GitHub url as devDependency", async () => {
      const projectName = "project-name";
      const { cwd, task } = runCli([
        "create",
        "coat-dev/cli-e2e-tests-template",
        projectName,
      ]);
      await task;

      const packageJsonRaw = await fs.readFile(
        path.join(cwd, projectName, "package.json"),
        "utf8"
      );
      const packageJson = JSON.parse(packageJsonRaw);
      expect(packageJson.devDependencies).toEqual({
        "@coat/e2e-test-template": "github:coat-dev/cli-e2e-tests-template",
        "no-op": "^1.0.3",
      });
    });
  });

  describe("coat.json", () => {
    test("should use the project name as the name field with correct formatting", async () => {
      const projectName = "project-name";
      const localCreateTemplate = path.join(
        __dirname,
        "..",
        "utils",
        "test-packages",
        "local-create-template-1"
      );
      const { cwd, task } = runCli([
        "create",
        localCreateTemplate,
        projectName,
      ]);
      await task;

      const coatManifestRaw = await fs.readFile(
        path.join(cwd, projectName, "coat.json"),
        "utf8"
      );
      const coatManifest = JSON.parse(coatManifestRaw);

      // Should use the project name as the name field
      expect(coatManifest.name).toBe("project-name");

      // Should be formatted json output with two spaces and a trailing new line
      const formatted = `${JSON.stringify(coatManifest, null, 2)}\n`;
      expect(formatted).toBe(coatManifestRaw);
    });

    test("should extend specified template name if no version specified", async () => {
      const { task, cwd } = runCli([
        "create",
        "@coat/e2e-test-template",
        "project-name",
      ]);
      await task;
      const coatManifestRaw = await fs.readFile(
        path.join(cwd, "project-name", "coat.json"),
        "utf8"
      );
      const coatManifest = JSON.parse(coatManifestRaw);
      expect(coatManifest.extends).toBe("@coat/e2e-test-template");
    });

    test("should extend template base name if a version is specified", async () => {
      const { task, cwd } = runCli([
        "create",
        "@coat/e2e-test-template@2.0.0",
        "project-name",
      ]);
      await task;
      const coatManifestRaw = await fs.readFile(
        path.join(cwd, "project-name", "coat.json"),
        "utf8"
      );
      const coatManifest = JSON.parse(coatManifestRaw);
      expect(coatManifest.extends).toBe("@coat/e2e-test-template");
    });

    test("should extend template name from package.json if GitHub URL is specified", async () => {
      const { task, cwd } = runCli([
        "create",
        "coat-dev/cli-e2e-tests-template",
        "project-name",
      ]);
      await task;
      const coatManifestRaw = await fs.readFile(
        path.join(cwd, "project-name", "coat.json"),
        "utf8"
      );
      const coatManifest = JSON.parse(coatManifestRaw);
      expect(coatManifest.extends).toBe("@coat/e2e-test-template");
    });
  });

  test("other files", async () => {
    const projectName = "project-name";
    const { cwd, task } = runCli([
      "create",
      "@coat/e2e-test-template",
      projectName,
    ]);
    await task;

    const projectDir = path.join(cwd, projectName);

    // Should create a package-lock.json file
    //
    // Only check whether file exists, don't make any assumptions about
    // the contents of the lockfile
    const entries = await fs.readdir(projectDir);
    expect(entries.includes("package-lock.json")).toBe(true);

    // Should install node_modules
    //
    // Only check whether the node_modules folder exists and is not empty.
    // There are no assumptions about the exact folder structure
    expect(entries.includes("node_modules")).toBe(true);
    const nodeModuleEntries = await fs.readdir(
      path.join(projectDir, "node_modules")
    );
    expect(nodeModuleEntries.length).toBeTruthy();
  });
});
