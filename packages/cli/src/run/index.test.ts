import fs from "fs-extra";
import path from "path";
import { vol } from "memfs";
import { run } from ".";
import { PACKAGE_JSON_FILENAME } from "../constants";
import { runMultipleScripts } from "./run-multiple-scripts";
import { runSingleScript } from "./run-single-script";

jest.mock("fs").mock("./run-single-script").mock("./run-multiple-scripts");

const platformRoot = path.parse(process.cwd()).root;
const testCwd = path.join(platformRoot, "test");

describe("run", () => {
  beforeEach(async () => {
    // Place package.json file in
    // testCwd to be able to access scripts
    // for testing
    await fs.outputFile(
      path.join(testCwd, PACKAGE_JSON_FILENAME),
      JSON.stringify({
        scripts: {
          singleScript: "single script",
          "multi:1": "multi one",
          "multi:2": "multi two",
          "multi:3": "multi three",
        },
      })
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    vol.reset();
  });

  test("should split script patterns and arguments correctly", async () => {
    await run({
      cwd: testCwd,
      scriptPatterns: ["singleScript", "--arg1", "--arg2", "arg2value"],
    });

    expect(runSingleScript).toBeCalledTimes(1);
    expect(runSingleScript).toHaveBeenLastCalledWith(testCwd, "singleScript", [
      "--arg1",
      "--arg2",
      "arg2value",
    ]);
  });

  test("should resolve scripts correctly from patterns", async () => {
    await run({ cwd: testCwd, scriptPatterns: ["singleScript*", "multi*"] });

    expect(runMultipleScripts).toHaveBeenCalledTimes(1);
    expect(runMultipleScripts).toHaveBeenLastCalledWith(
      testCwd,
      ["singleScript", "multi:1", "multi:2", "multi:3"],
      []
    );
  });

  test("should throw if no package.json can be found in cwd", async () => {
    await fs.unlink(path.join(testCwd, PACKAGE_JSON_FILENAME));

    await expect(() =>
      run({ cwd: testCwd, scriptPatterns: ["multi:*", "singleScript"] })
    ).rejects.toHaveProperty(
      "message",
      expect.stringMatching(
        /ENOENT: no such file or directory, open .*package.json/
      )
    );
  });

  test("should throw if no script pattern is provided but only arguments", async () => {
    await expect(() =>
      run({ cwd: testCwd, scriptPatterns: ["--arg1", "--arg2", "arg2Value"] })
    ).rejects.toHaveProperty("message", "No script pattern provided.");
  });

  test("should throw if no script can be found for a pattern", async () => {
    await expect(() =>
      run({
        cwd: testCwd,
        scriptPatterns: ["unknown-pattern:*", "singleScript"],
      })
    ).rejects.toHaveProperty(
      "message",
      "No scripts found in package.json for pattern: unknown-pattern:*"
    );
  });

  test("should throw if no script can be found for a script name", async () => {
    // Place empty package.json without scripts entry to
    // let run function not find any scripts
    await fs.outputFile(
      path.join(testCwd, PACKAGE_JSON_FILENAME),
      JSON.stringify({})
    );

    await expect(() =>
      run({ cwd: testCwd, scriptPatterns: ["singleScript"] })
    ).rejects.toHaveProperty(
      "message",
      'No script named "singleScript" found in package.json'
    );
  });

  test.each`
    input                                                 | runParams                                              | explanation
    ${["singleScript"]}                                   | ${["singleScript", []]}                                | ${"name without arguments"}
    ${["singleScript", "--arg1", "--arg2", "arg2Value"]}  | ${["singleScript", ["--arg1", "--arg2", "arg2Value"]]} | ${"name with arguments"}
    ${["singleScript*"]}                                  | ${["singleScript", []]}                                | ${"pattern without arguments"}
    ${["singleScript*", "--arg1", "--arg2", "arg2Value"]} | ${["singleScript", ["--arg1", "--arg2", "arg2Value"]]} | ${"pattern with arguments"}
  `(
    "should run single script from $explanation",
    async ({ input, runParams }) => {
      await run({ cwd: testCwd, scriptPatterns: input });

      expect(runSingleScript).toHaveBeenCalledTimes(1);
      expect(runSingleScript).toHaveBeenLastCalledWith(testCwd, ...runParams);
    }
  );

  test.each`
    input                                                           | runParams                                                                 | explanation
    ${["multi:1", "singleScript"]}                                  | ${[["multi:1", "singleScript"], []]}                                      | ${"two single scripts without arguments"}
    ${["multi:1", "singleScript", "--arg1", "--arg2", "arg2Value"]} | ${[["multi:1", "singleScript"], ["--arg1", "--arg2", "arg2Value"]]}       | ${"two single scripts with arguments"}
    ${["multi:*"]}                                                  | ${[["multi:1", "multi:2", "multi:3"], []]}                                | ${"pattern without arguments"}
    ${["multi:*", "--arg1", "--arg2", "arg2Value"]}                 | ${[["multi:1", "multi:2", "multi:3"], ["--arg1", "--arg2", "arg2Value"]]} | ${"pattern with arguments"}
  `(
    "should run single script from $explanation",
    async ({ input, runParams }) => {
      await run({ cwd: testCwd, scriptPatterns: input });

      expect(runMultipleScripts).toHaveBeenCalledTimes(1);
      expect(runMultipleScripts).toHaveBeenLastCalledWith(
        testCwd,
        ...runParams
      );
    }
  );
});
