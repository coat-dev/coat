import { promises as fs } from "fs";
import path from "path";
import { runCli } from "../utils/run-cli";

describe("coat create - template resolution", () => {
  const defaultProjectName = "project-name";

  test("should resolve latest version of the template if no version specified", async () => {
    const { task, cwd } = runCli([
      "create",
      "@coat/e2e-test-template",
      defaultProjectName,
    ]);
    await task;
    const packageJson = await fs.readFile(
      path.join(cwd, defaultProjectName, "package.json"),
      "utf8"
    );
    expect(
      JSON.parse(packageJson).devDependencies["@coat/e2e-test-template"]
    ).toBe("2.0.0");
  });

  test("should resolve latest satisfying version of the template if version range is specified", async () => {
    const { task, cwd } = runCli([
      "create",
      "@coat/e2e-test-template@^1.0.0",
      defaultProjectName,
    ]);
    await task;
    const packageJson = await fs.readFile(
      path.join(cwd, defaultProjectName, "package.json"),
      "utf8"
    );
    expect(
      JSON.parse(packageJson).devDependencies["@coat/e2e-test-template"]
    ).toBe("1.0.1");
  });

  test("should resolve exact version of the template if exact version is specified", async () => {
    const { task, cwd } = runCli([
      "create",
      "@coat/e2e-test-template@1.0.0",
      defaultProjectName,
    ]);
    await task;
    const packageJson = await fs.readFile(
      path.join(cwd, defaultProjectName, "package.json"),
      "utf8"
    );
    expect(
      JSON.parse(packageJson).devDependencies["@coat/e2e-test-template"]
    ).toBe("1.0.0");
  });

  test("should keep specific commit of the template if a GitHub commit is specified", async () => {
    const { task, cwd } = runCli([
      "create",
      "coat-dev/cli-e2e-tests-template#ce6dc94dbb87f5d4c297f27763621d39d55656c9",
      defaultProjectName,
    ]);
    await task;
    const packageJson = await fs.readFile(
      path.join(cwd, defaultProjectName, "package.json"),
      "utf8"
    );
    expect(
      JSON.parse(packageJson).devDependencies["@coat/e2e-test-template"]
    ).toBe(
      "github:coat-dev/cli-e2e-tests-template#ce6dc94dbb87f5d4c297f27763621d39d55656c9"
    );
  });
});
