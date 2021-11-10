import { ExecaError } from "execa";
import { version } from "../../package.json";
import { createProgram } from "./cli";
import { create } from "../create";
import { sync } from "../sync";
import { setup } from "../setup";
import { run } from "../run";

jest.mock("../create").mock("../sync").mock("../setup").mock("../run");

jest.spyOn(process, "cwd").mockImplementation(() => "mock-cwd");

const exitMock = jest.spyOn(process, "exit").mockImplementation(
  // @ts-expect-error
  (): never => {
    // Empty mock functino
  }
);

const runMock = run as jest.Mock<
  ReturnType<typeof run>,
  Parameters<typeof run>
>;

const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {
  // Empty mock function
});

describe("coat cli", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should print out version", async () => {
    expect.assertions(3);

    const stdoutMock = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    const program = createProgram();
    program.exitOverride();

    try {
      await program.parseAsync(["--version"], { from: "user" });
    } catch (error) {
      expect(stdoutMock).toHaveBeenCalledTimes(1);
      expect(stdoutMock).toHaveBeenCalledWith(`${version}\n`);
      expect((error as ExecaError).exitCode).toBe(0);
    }
  });

  test.each`
    input                                 | args                                                                          | explanation
    ${["template"]}                       | ${{ template: "template", directory: undefined, projectName: undefined }}     | ${"template"}
    ${["template", "projectName"]}        | ${{ template: "template", directory: "projectName", projectName: undefined }} | ${"template & projectName"}
    ${["template", "projectName", "dir"]} | ${{ template: "template", directory: "projectName", projectName: "dir" }}     | ${"template, projectName & dir"}
  `(
    "should call create function with $explanation",
    async ({ input, args }) => {
      const program = createProgram();

      await program.parseAsync(["create", ...input], { from: "user" });

      expect(create).toHaveBeenCalledTimes(1);
      expect(create).toHaveBeenCalledWith(args);
    }
  );

  test.each`
    input                                   | args                                                     | explanation
    ${["sync"]}                             | ${{ cwd: "mock-cwd", check: false, skipInstall: false }} | ${"current working directory"}
    ${["sync", "--check"]}                  | ${{ cwd: "mock-cwd", check: true, skipInstall: false }}  | ${"check flag"}
    ${["sync", "--skipInstall"]}            | ${{ cwd: "mock-cwd", check: false, skipInstall: true }}  | ${"skipInstall flag"}
    ${["sync", "--check", "--skipInstall"]} | ${{ cwd: "mock-cwd", check: true, skipInstall: true }}   | ${"check & skipInstall flag"}
  `("should call sync function with $explanation", async ({ input, args }) => {
    const program = createProgram();

    await program.parseAsync(input, { from: "user" });

    expect(sync).toHaveBeenCalledTimes(1);
    expect(sync).toHaveBeenLastCalledWith(args);
  });

  test("should call setup function with current working directory & force option", async () => {
    const program = createProgram();

    await program.parseAsync(["setup"], { from: "user" });

    expect(setup).toHaveBeenCalledTimes(1);
    expect(setup).toHaveBeenCalledWith({ cwd: "mock-cwd", force: true });
  });

  test.each`
    input                                                                    | explanation
    ${["singleScript"]}                                                      | ${"a single script pattern"}
    ${["singleScript", "--option1", "--option2", "value"]}                   | ${"a single script pattern with options"}
    ${["multiple", "script", "patterns"]}                                    | ${"multiple script patterns"}
    ${["multiple", "script", "patterns", "--option1", "--option2", "value"]} | ${"multiple script patterns with options"}
  `("should call run function with $explanation", async ({ input }) => {
    const program = createProgram();

    await program.parseAsync(["run", ...input], { from: "user" });

    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith({
      cwd: "mock-cwd",
      scriptPatterns: input,
    });
  });

  test("should exit from run function with correct error code thrown from script", async () => {
    const program = createProgram();

    exitMock.mockImplementationOnce((): never => {
      throw new Error("process.exit");
    });

    runMock.mockImplementationOnce(async () => {
      const error = new Error("script error");
      // @ts-expect-error
      error.exitCode = 5;
      throw error;
    });

    await expect(() =>
      program.parseAsync(["run", "test-script"], { from: "user" })
    ).rejects.toHaveProperty("message", "process.exit");

    expect(exitMock).toHaveBeenCalledTimes(1);
    expect(exitMock).toHaveBeenLastCalledWith(5);
  });

  test("should rethrow error from run function if no exitCode is available", async () => {
    const program = createProgram();

    runMock.mockImplementationOnce(async () => {
      throw new Error("run error");
    });

    await expect(
      program.parseAsync(["run", "test-script"], { from: "user" })
    ).rejects.toHaveProperty("message", "run error");

    expect(exitMock).not.toHaveBeenCalled();
  });

  describe("unknown commands", () => {
    test("should call run function if no known command is passed to coat", async () => {
      const program = createProgram();

      await program.parseAsync(["build", "--watch"], { from: "user" });
      expect(run).toHaveBeenCalledTimes(1);
      expect(run).toHaveBeenLastCalledWith({
        cwd: "mock-cwd",
        scriptPatterns: ["build", "--watch"],
      });

      await program.parseAsync(["test", "--watch"], { from: "user" });
      expect(run).toHaveBeenCalledTimes(2);
      expect(run).toHaveBeenLastCalledWith({
        cwd: "mock-cwd",
        scriptPatterns: ["test", "--watch"],
      });
    });

    test("should exit immediately if script is run on unknown command and throws with exitCode", async () => {
      const program = createProgram();

      runMock.mockImplementationOnce(async () => {
        const error = new Error("script error");
        // @ts-expect-error
        error.exitCode = 5;
        throw error;
      });

      await program.parseAsync(["build", "--watch"], { from: "user" });

      expect(exitMock).toHaveBeenCalledTimes(1);
      expect(exitMock).toHaveBeenLastCalledWith(5);
    });

    test("should display unknown command error message if any other error occurred during run", async () => {
      const program = createProgram();

      runMock.mockImplementationOnce(async () => {
        throw new Error("script error");
      });

      await program.parseAsync(["build", "--watch"], { from: "user" });

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenLastCalledWith(
        "error: unknown script or command 'build'. See 'coat --help'"
      );

      expect(exitMock).toHaveBeenCalledTimes(1);
      expect(exitMock).toHaveBeenLastCalledWith(1);
    });
  });
});
