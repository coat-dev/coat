import { promises as fs } from "fs";
import path from "path";
import execa from "execa";
import { prepareCliTest } from "../utils/run-cli-test";
import { PACKAGE_JSON_FILENAME } from "../../src/constants";
import { runCli } from "../utils/run-cli";
import stripAnsi from "strip-ansi";

describe("sync/flows", () => {
  const testPackagesPath = path.join(__dirname, "..", "utils", "test-packages");

  test("typical template update flow", async () => {
    // Tests that a typical template update flow works as expected
    //
    // A coat project should contain a template that generates
    // 2 continuous and 2 once files.
    // This template should then be updated to a newer version, that has
    // newer versions of these generated files.
    // The coat cli should be installed locally in that project and there
    // should be a prepare script that runs `coat sync` to verify that
    // simply updating the template version will update all files
    // except the once file without prompts (since there are no modifications)
    //
    const templateV1 = path.join(
      testPackagesPath,
      "local-template-update-flow-1"
    );
    const templateV2 = path.join(
      testPackagesPath,
      "local-template-update-flow-2"
    );

    // Run sync for the first time with template v1
    const cwd = await prepareCliTest({
      coatManifest: {
        name: "update-flow-test",
        extends: ["local-template-update-flow"],
      },
    });

    // Install v1 of the template and the coat cli as dependencies
    await execa(
      "npm",
      ["install", templateV1, process.env.COAT_CLI_TMP_TARBALL_PATH as string],
      { cwd }
    );

    // Run sync
    const { task: firstSyncRun } = runCli(["sync"], { cwd });
    const firstSyncResult = await firstSyncRun;
    expect(stripAnsi(firstSyncResult.stdout)).toMatchInlineSnapshot(`
      "
        CREATED  .gitignore
        CREATED  global-once.json
        CREATED  global-only-v1.json
        CREATED  global.json
        CREATED  local-once.json
        CREATED  local.json
        UPDATED  package.json
      "
    `);

    // Verify files
    const files = await Promise.all([
      fs.readFile(path.join(cwd, "global-once.json"), "utf-8"),
      fs.readFile(path.join(cwd, "global.json"), "utf-8"),
      fs.readFile(path.join(cwd, "local-once.json"), "utf-8"),
      fs.readFile(path.join(cwd, "local.json"), "utf-8"),
      fs.readFile(path.join(cwd, "global-only-v1.json"), "utf-8"),
    ]);
    let [globalOnceRaw, globalRaw, localOnceRaw, localRaw] = files;
    const globalOnlyV1Raw = files[4];

    let globalOnce = JSON.parse(globalOnceRaw);
    let globalFile = JSON.parse(globalRaw);
    let localOnce = JSON.parse(localOnceRaw);
    let local = JSON.parse(localRaw);
    const globalOnlyV1 = JSON.parse(globalOnlyV1Raw);

    expect(globalOnce).toEqual({
      global: "once",
      version: 1,
    });
    expect(globalFile).toEqual({
      global: "continuous",
      version: 1,
    });
    expect(localOnce).toEqual({
      local: "once",
      version: 1,
    });
    expect(local).toEqual({
      local: "continuous",
      version: 1,
    });
    expect(globalOnlyV1).toEqual({
      global: "only-in-v1",
      version: 1,
    });

    // Add prepare script to package.json
    const packageJsonRaw = await fs.readFile(
      path.join(cwd, PACKAGE_JSON_FILENAME),
      "utf-8"
    );
    const packageJson = JSON.parse(packageJsonRaw);
    packageJson.scripts = {
      prepare: "coat sync",
    };
    await fs.writeFile(
      path.join(cwd, PACKAGE_JSON_FILENAME),
      JSON.stringify(packageJson)
    );

    // Install v2 of the template and run npm install
    await execa("npm", ["install", templateV2], { cwd });
    const secondRun = await execa("npm", ["install"], { cwd });
    const allMessages = stripAnsi(secondRun.stdout);
    expect(allMessages).toEqual(
      expect.stringContaining("DELETED  global-only-v1.json")
    );
    expect(allMessages).toEqual(expect.stringContaining("UPDATED  local.json"));
    expect(allMessages).toEqual(
      expect.stringContaining("UPDATED  global.json")
    );

    // Verify files after update
    //
    // Ensure global-v1-only file is no longer placed
    await expect(() =>
      fs.readFile(path.join(cwd, "global-only-v1.json"))
    ).rejects.toHaveProperty(
      "message",
      expect.stringMatching(
        /ENOENT: no such file or directory, open '.*global-only-v1.json/
      )
    );

    [globalOnceRaw, globalRaw, localOnceRaw, localRaw] = await Promise.all([
      fs.readFile(path.join(cwd, "global-once.json"), "utf-8"),
      fs.readFile(path.join(cwd, "global.json"), "utf-8"),
      fs.readFile(path.join(cwd, "local-once.json"), "utf-8"),
      fs.readFile(path.join(cwd, "local.json"), "utf-8"),
    ]);

    globalOnce = JSON.parse(globalOnceRaw);
    globalFile = JSON.parse(globalRaw);
    localOnce = JSON.parse(localOnceRaw);
    local = JSON.parse(localRaw);

    expect(globalOnce).toEqual({
      global: "once",
      version: 1,
    });
    expect(globalFile).toEqual({
      global: "continuous",
      version: 2,
    });
    expect(localOnce).toEqual({
      local: "once",
      version: 1,
    });
    expect(local).toEqual({
      local: "continuous",
      version: 2,
    });
  });
});
