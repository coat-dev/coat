import { version } from "../../package.json";
import { createProgram } from "./cli";
import { create } from "../create";
import { sync } from "../sync";
import { setup } from "../setup";
import { run } from "../run";

jest.mock("../create").mock("../sync").mock("../setup").mock("../run");

jest.spyOn(process, "cwd").mockImplementation(() => "mock-cwd");

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
      expect(error.exitCode).toBe(0);
    }
  });

  test.each`
    input                                 | args                                      | explanation
    ${["template"]}                       | ${["template", undefined, undefined]}     | ${"template"}
    ${["template", "projectName"]}        | ${["template", "projectName", undefined]} | ${"template & projectName"}
    ${["template", "projectName", "dir"]} | ${["template", "projectName", "dir"]}     | ${"template, projectName & dir"}
  `(
    "should call create function with $explanation",
    async ({ input, args }) => {
      const program = createProgram();

      await program.parseAsync(["create", ...input], { from: "user" });

      expect(create).toHaveBeenCalledTimes(1);
      expect(create).toHaveBeenCalledWith(...args, {});
    }
  );

  test("should call sync function with current working directory", async () => {
    const program = createProgram();

    await program.parseAsync(["sync"], { from: "user" });

    expect(sync).toHaveBeenCalledTimes(1);
    expect(sync).toHaveBeenLastCalledWith("mock-cwd");
  });

  test("should call setup function with current working directory & force option", async () => {
    const program = createProgram();

    await program.parseAsync(["setup"], { from: "user" });

    expect(setup).toHaveBeenCalledTimes(1);
    expect(setup).toHaveBeenCalledWith("mock-cwd", true);
  });

  test.each`
    input                                 | explanation
    ${["singleScript"]}                   | ${"a single script pattern"}
    ${["multiple", "script", "patterns"]} | ${"multiple script patterns"}
  `("should call run function with $explanation", async ({ input }) => {
    const program = createProgram();

    await program.parseAsync(["run", ...input], { from: "user" });

    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith(input);
  });
});
