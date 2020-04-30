import { promises as fs } from "fs";
import path from "path";
import { runCli } from "../utils/run-cli";
import { cleanupTmpDirs } from "../utils/get-tmp-dir";

jest.setTimeout(30000);

afterAll(() => {
  cleanupTmpDirs();
});

describe("coat create - template resolution", () => {
  const defaultProjectName = "project-name";

  test.concurrent(
    "should resolve latest version of the template if no version specified",
    async () => {
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
        JSON.parse(packageJson).devDependencies[
          "@coat/integration-test-template"
        ]
      ).toBe("2.0.0");
    }
  );

  test.concurrent(
    "should resolve latest satisfying version of the template if version range is specified",
    async () => {
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
        JSON.parse(packageJson).devDependencies[
          "@coat/integration-test-template"
        ]
      ).toBe("1.0.2");
    }
  );

  test.concurrent(
    "should resolve exact version of the template if exact version is specified",
    async () => {
      const { task, cwd } = runCli([
        "create",
        "@coat/integration-test-template@1.0.1",
        defaultProjectName,
      ]);
      await task;
      const packageJson = await fs.readFile(
        path.join(cwd, defaultProjectName, "package.json"),
        "utf8"
      );
      expect(
        JSON.parse(packageJson).devDependencies[
          "@coat/integration-test-template"
        ]
      ).toBe("1.0.1");
    }
  );

  test.concurrent(
    "should keep specific commit of the template if a GitHub commit is specified",
    async () => {
      const { task, cwd } = runCli([
        "create",
        "coat-dev/cli-integration-tests-template#1874212e150bfd04091f16631ed2b6c711218fa0",
        defaultProjectName,
      ]);
      await task;
      const packageJson = await fs.readFile(
        path.join(cwd, defaultProjectName, "package.json"),
        "utf8"
      );
      expect(
        JSON.parse(packageJson).devDependencies[
          "@coat/integration-test-template"
        ]
      ).toBe(
        "github:coat-dev/cli-integration-tests-template#1874212e150bfd04091f16631ed2b6c711218fa0"
      );
    }
  );
});
