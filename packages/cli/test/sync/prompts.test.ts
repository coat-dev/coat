import { promises as fs } from "fs";
import path from "path";
import stripAnsi from "strip-ansi";
import { enterPrompts, KeyboardInput } from "../utils/enter-prompts";
import { runCli } from "../utils/run-cli";
import { prepareCliTest, runSyncTest } from "../utils/run-cli-test";

describe("sync/prompts", () => {
  const testPackagesPath = path.join(__dirname, "..", "utils", "test-packages");

  test("should prompt if template is added to existing project where managed files already exist with different content - user aborts", async () => {
    const localFiles3Template = path.join(testPackagesPath, "local-files-3");

    // Place files from local-files-3 template with different content in a temporary directory
    const cwd = await prepareCliTest({
      coatManifest: {
        name: "test-project",
        extends: [localFiles3Template],
      },
    });

    await Promise.all([
      fs.writeFile(path.join(cwd, "a.json"), JSON.stringify({ a: "before" })),
      fs.writeFile(path.join(cwd, "b.txt"), "b text before"),
      fs.writeFile(path.join(cwd, "c.txt"), "c text before"),
    ]);

    // Run sync with prompt
    const { task: firstRun } = runCli(["sync"], { cwd });
    // Default behavior - just pressing enter - should abort sync
    enterPrompts(firstRun.stdin, [KeyboardInput.Enter]);

    await expect(firstRun).rejects.toHaveProperty(
      "stderr",
      "Aborting coat sync due to user request."
    );

    // Entering "n" for actively saying no
    const { task: secondRun } = runCli(["sync"], { cwd });
    enterPrompts(secondRun.stdin, ["no", KeyboardInput.Enter]);

    await expect(secondRun).rejects.toHaveProperty(
      "stderr",
      "Aborting coat sync due to user request."
    );

    // Ensure that files have not been modified
    const [a, b, c] = await Promise.all([
      fs.readFile(path.join(cwd, "a.json"), "utf-8"),
      fs.readFile(path.join(cwd, "b.txt"), "utf-8"),
      fs.readFile(path.join(cwd, "c.txt"), "utf-8"),
    ]);

    expect(a).toBe('{"a":"before"}');
    expect(b).toBe("b text before");
    expect(c).toBe("c text before");
  });

  test("should prompt if template is added to existing project where managed files already exist with different content - user continues", async () => {
    const localFiles3Template = path.join(testPackagesPath, "local-files-3");

    // Place files from local-files-3 template with different content in a temporary directory
    const cwd = await prepareCliTest({
      coatManifest: {
        name: "test-project",
        extends: [localFiles3Template],
      },
    });

    await Promise.all([
      fs.writeFile(path.join(cwd, "a.json"), JSON.stringify({ a: "before" })),
      fs.writeFile(path.join(cwd, "b.txt"), "b text before"),
      fs.writeFile(path.join(cwd, "c.txt"), "c text before"),
    ]);

    // Run sync with prompt
    const { task } = runCli(["sync"], { cwd });
    // Enter y for yes
    enterPrompts(task.stdin, ["y", KeyboardInput.Enter]);

    const result = await task;
    expect(stripAnsi(result.stdout)).toMatchInlineSnapshot(`
      "The following files already exist in your project and will be overwritten and managed by coat from now:

      a.json
      b.txt
      c.txt

      These files will be overwritten each time coat sync is run. You can customize them by placing a <filename>-custom.js file next to them.

      ? Continue with overwriting these files? (y/N) ? Continue with overwriting these files? (y/N) y? Continue with overwriting these files? Yes

        CREATED  .gitignore
        UPDATED  a.json
        UPDATED  b.txt
        UPDATED  c.txt
        UPDATED  package.json
      "
    `);

    // Ensure that files have been updated
    const [a, b, c] = await Promise.all([
      fs.readFile(path.join(cwd, "a.json"), "utf-8"),
      fs.readFile(path.join(cwd, "b.txt"), "utf-8"),
      fs.readFile(path.join(cwd, "c.txt"), "utf-8"),
    ]);

    expect(JSON.parse(a)).toEqual({
      firstProperty: {
        c: true,
      },
      secondProperty: 987,
    });
    expect(b).toBe("Text from local-files-3\n");
    expect(c).toBe("Text from local-files-3\n");
  });

  test("should prompt after a project has been synced and the contents of managed files have been modified - user aborts", async () => {
    const localFiles3Template = path.join(testPackagesPath, "local-files-3");

    // Run first sync
    const { cwd, task: firstSyncRun } = await runSyncTest({
      coatManifest: {
        name: "test-project",
        extends: [localFiles3Template],
      },
    });
    const firstSyncResult = await firstSyncRun;
    expect(stripAnsi(firstSyncResult.stdout)).toMatchInlineSnapshot(`
      "
        CREATED  .gitignore
        CREATED  a.json
        CREATED  b.txt
        CREATED  c.txt
        UPDATED  package.json
      "
    `);

    // Modify two managed files
    await Promise.all([
      fs.writeFile(path.join(cwd, "b.txt"), "Modified B"),
      fs.writeFile(path.join(cwd, "c.txt"), "Modified C"),
    ]);

    // Run sync again
    const { task: secondSyncRun } = runCli(["sync"], { cwd });

    // Default behavior - just pressing enter - should abort sync
    enterPrompts(secondSyncRun.stdin, [KeyboardInput.Enter]);

    await expect(secondSyncRun).rejects.toHaveProperty(
      "stderr",
      "Aborting coat sync due to user request."
    );

    // Entering "n" for actively saying no
    const { task: thirdSyncRun } = runCli(["sync"], { cwd });
    enterPrompts(thirdSyncRun.stdin, ["no", KeyboardInput.Enter]);

    await expect(thirdSyncRun).rejects.toHaveProperty(
      "stderr",
      "Aborting coat sync due to user request."
    );

    // Ensure all files are unmodified
    const [b, c] = await Promise.all([
      fs.readFile(path.join(cwd, "b.txt"), "utf-8"),
      fs.readFile(path.join(cwd, "c.txt"), "utf-8"),
    ]);

    expect(b).toBe("Modified B");
    expect(c).toBe("Modified C");
  });

  test("should prompt after a project has been synced and the contents of managed files have been modified - user continues", async () => {
    const localFiles3Template = path.join(testPackagesPath, "local-files-3");

    // Run first sync
    const { cwd, task: firstSyncRun } = await runSyncTest({
      coatManifest: {
        name: "test-project",
        extends: [localFiles3Template],
      },
    });
    const firstSyncResult = await firstSyncRun;
    expect(stripAnsi(firstSyncResult.stdout)).toMatchInlineSnapshot(`
      "
        CREATED  .gitignore
        CREATED  a.json
        CREATED  b.txt
        CREATED  c.txt
        UPDATED  package.json
      "
    `);

    // Modify two managed files
    await Promise.all([
      fs.writeFile(path.join(cwd, "b.txt"), "Modified B"),
      fs.writeFile(path.join(cwd, "c.txt"), "Modified C"),
    ]);

    // Run sync again
    const { task: secondSyncRun } = runCli(["sync"], { cwd });

    // Confirm overwrite by entering "y"
    enterPrompts(secondSyncRun.stdin, ["y", KeyboardInput.Enter]);

    const secondSyncResult = await secondSyncRun;
    expect(stripAnsi(secondSyncResult.stdout)).toMatchInlineSnapshot(`
      "The contents of the following files have changed:

      b.txt
      c.txt

      These files are managed by coat and will be overwritten each time coat sync is run.

      You can customize them by placing a <filename>-custom.js file next to them.

      ? Continue with overwriting these files? (y/N) ? Continue with overwriting these files? (y/N) y? Continue with overwriting these files? Yes

        UPDATED  b.txt
        UPDATED  c.txt
      "
    `);

    // Ensure files are updated by coat
    const [b, c] = await Promise.all([
      fs.readFile(path.join(cwd, "b.txt"), "utf-8"),
      fs.readFile(path.join(cwd, "c.txt"), "utf-8"),
    ]);

    expect(b).toBe("Text from local-files-3\n");
    expect(c).toBe("Text from local-files-3\n");
  });
});
