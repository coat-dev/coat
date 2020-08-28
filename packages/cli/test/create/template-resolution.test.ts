import { promises as fs } from "fs";
import path from "path";
import { runCli } from "../utils/run-cli";

describe("coat create - template resolution", () => {
  const defaultProjectName = "project-name";

  test("should resolve latest version of the template if no version specified", async () => {
    const { task, cwd } = runCli([
      "create",
      "@coat/integration-test-template",
      defaultProjectName,
    ]);
    await task;
    const packageJson = await fs.readFile(
      path.join(cwd, defaultProjectName, "package.json"),
      "utf8"
    );
    expect(
      JSON.parse(packageJson).devDependencies["@coat/integration-test-template"]
    ).toBe("2.1.0");
  });

  test("should resolve latest satisfying version of the template if version range is specified", async () => {
    const { task, cwd } = runCli([
      "create",
      "@coat/integration-test-template@^1.0.0",
      defaultProjectName,
    ]);
    await task;
    const packageJson = await fs.readFile(
      path.join(cwd, defaultProjectName, "package.json"),
      "utf8"
    );
    expect(
      JSON.parse(packageJson).devDependencies["@coat/integration-test-template"]
    ).toBe("1.0.4");
  });

  test("should resolve exact version of the template if exact version is specified", async () => {
    const { task, cwd } = runCli([
      "create",
      "@coat/integration-test-template@1.0.3",
      defaultProjectName,
    ]);
    await task;
    const packageJson = await fs.readFile(
      path.join(cwd, defaultProjectName, "package.json"),
      "utf8"
    );
    expect(
      JSON.parse(packageJson).devDependencies["@coat/integration-test-template"]
    ).toBe("1.0.3");
  });

  test("should keep specific commit of the template if a GitHub commit is specified", async () => {
    const { task, cwd } = runCli([
      "create",
      "coat-dev/cli-integration-tests-template#10797794f09b29692053190bd3c9cce2d44370d9",
      defaultProjectName,
    ]);
    await task;
    const packageJson = await fs.readFile(
      path.join(cwd, defaultProjectName, "package.json"),
      "utf8"
    );
    expect(
      JSON.parse(packageJson).devDependencies["@coat/integration-test-template"]
    ).toBe(
      "github:coat-dev/cli-integration-tests-template#10797794f09b29692053190bd3c9cce2d44370d9"
    );
  });
});
