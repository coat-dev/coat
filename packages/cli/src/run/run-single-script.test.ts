import path from "path";
import execa from "execa";
import { runSingleScript } from "./run-single-script";

jest.mock("execa");

const platformRoot = path.parse(process.cwd()).root;
const testCwd = path.join(platformRoot, "test");

describe("run/run-single-script", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should call npm run with silent flag", async () => {
    await runSingleScript(testCwd, "script");

    expect(execa).toHaveBeenCalledTimes(1);
    expect(execa).toHaveBeenLastCalledWith(
      "npm",
      ["run", "--silent", "script"],
      {
        cwd: testCwd,
        stdio: "inherit",
      }
    );
  });

  test("should add arguments with double dashes", async () => {
    await runSingleScript(testCwd, "script", ["--arg1", "--arg2", "arg2Value"]);

    expect(execa).toHaveBeenCalledTimes(1);
    expect(execa).toHaveBeenLastCalledWith(
      "npm",
      ["run", "--silent", "script", "--", "--arg1", "--arg2", "arg2Value"],
      {
        cwd: testCwd,
        stdio: "inherit",
      }
    );
  });
});
