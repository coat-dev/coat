import execa from "execa";
import path from "path";
import memoryStreams from "memory-streams";
import stripAnsi from "strip-ansi";
import { runMultipleScripts } from "./run-multiple-scripts";

jest.mock("execa");

const platformRoot = path.parse(process.cwd()).root;
const testCwd = path.join(platformRoot, "test");

const execaMock = (execa as unknown) as jest.Mock;
execaMock.mockReturnValue({});

describe("run/run-multiple-scripts", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should call multiple scripts without arguments", async () => {
    await runMultipleScripts(testCwd, ["script1", "script2"]);

    expect(execa).toHaveBeenCalledTimes(2);
    expect(execa).toHaveBeenNthCalledWith(
      1,
      "npm",
      ["run", "--silent", "script1"],
      { cwd: testCwd, env: { FORCE_COLOR: "true" } }
    );
    expect(execa).toHaveBeenNthCalledWith(
      2,
      "npm",
      ["run", "--silent", "script2"],
      { cwd: testCwd, env: { FORCE_COLOR: "true" } }
    );
  });

  test("should call multiple scripts with arguments", async () => {
    await runMultipleScripts(
      testCwd,
      ["script1", "script2"],
      ["--arg1", "--arg2", "arg2Value"]
    );

    expect(execa).toHaveBeenCalledTimes(2);
    expect(execa).toHaveBeenNthCalledWith(
      1,
      "npm",
      ["run", "--silent", "script1", "--", "--arg1", "--arg2", "arg2Value"],
      { cwd: testCwd, env: { FORCE_COLOR: "true" } }
    );
    expect(execa).toHaveBeenNthCalledWith(
      2,
      "npm",
      ["run", "--silent", "script2", "--", "--arg1", "--arg2", "arg2Value"],
      { cwd: testCwd, env: { FORCE_COLOR: "true" } }
    );
  });

  describe("output prefixing", () => {
    let stdout: memoryStreams.WritableStream;
    let stderr: memoryStreams.WritableStream;
    let taskStdout: memoryStreams.ReadableStream;
    let taskStderr: memoryStreams.ReadableStream;

    let stdoutSpy: jest.SpyInstance;
    let stderrSpy: jest.SpyInstance;

    beforeEach(() => {
      stdout = new memoryStreams.WritableStream();
      stderr = new memoryStreams.WritableStream();
      taskStdout = new memoryStreams.ReadableStream("");
      taskStderr = new memoryStreams.ReadableStream("");

      stdoutSpy = jest
        .spyOn(process.stdout, "write")
        // @ts-expect-error
        .mockImplementation(stdout.write.bind(stdout));
      stderrSpy = jest
        .spyOn(process.stderr, "write")
        // @ts-expect-error
        .mockImplementation(stderr.write.bind(stderr));

      execaMock.mockReturnValue({
        stdout: taskStdout,
        stderr: taskStderr,
      });
    });

    afterEach(() => {
      stdoutSpy.mockRestore();
      stderrSpy.mockRestore();
    });

    test("should prefix stdout with script name as a label", async () => {
      await runMultipleScripts(testCwd, ["script-1"]);

      // memory-streams does not contain type defintions for
      // the append function
      //
      // @ts-expect-error
      taskStdout.append("First line \n");
      // @ts-expect-error
      taskStdout.append("Second ");
      // @ts-expect-error
      taskStdout.append("line \n");
      // @ts-expect-error
      taskStdout.append("Third line \n");

      expect(stderr.toString()).toBe("");

      // Strip colors to have consistent snapshot
      const stdoutText = stripAnsi(stdout.toString());

      expect(stdoutText).toMatchInlineSnapshot(`
        "script-1 - First line 
        script-1 - Second line 
        script-1 - Third line 
        "
      `);
    });

    test("should prefix stderr with script name as a label", async () => {
      await runMultipleScripts(testCwd, ["script-1"]);

      // memory-streams does not contain type defintions for
      // the append function
      //
      // @ts-expect-error
      taskStderr.append("First line \n");
      // @ts-expect-error
      taskStderr.append("Second ");
      // @ts-expect-error
      taskStderr.append("line \n");
      // @ts-expect-error
      taskStderr.append("Third line \n");

      expect(stdout.toString()).toBe("");

      // Strip colors to have consistent snapshot
      const stderrText = stripAnsi(stderr.toString());

      expect(stderrText).toMatchInlineSnapshot(`
        "script-1 - First line 
        script-1 - Second line 
        script-1 - Third line 
        "
      `);
    });
  });
});
