import { version } from "../../package.json";
import { createProgram } from "./cli";
import { create } from "../create";
import { sync } from "../sync";

jest.mock("../create").mock("../sync");

describe("coat cli", () => {
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
      (create as jest.Mock).mockClear();

      const program = createProgram();

      await program.parseAsync(["create", ...input], { from: "user" });

      expect(create).toHaveBeenCalledTimes(1);
      expect(create).toHaveBeenCalledWith(...args, {});
    }
  );

  test("should call sync function with current working directory", async () => {
    jest.spyOn(process, "cwd").mockImplementationOnce(() => "mock-cwd");
    const program = createProgram();

    await program.parseAsync(["sync"], { from: "user" });

    expect(sync).toHaveBeenCalledTimes(1);
    expect(sync).toHaveBeenLastCalledWith("mock-cwd");
  });
});
