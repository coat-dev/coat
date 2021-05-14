import path from "path";
import execa from "execa";
import { addInitialCommit } from "./add-initial-commit";

jest.mock("execa");

const platformRoot = path.parse(process.cwd()).root;
const testCwd = path.join(platformRoot, "test");

const execaMock = execa as unknown as jest.Mock;

describe("create/add-initial-commit", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test("should create a git repository and create an initial commit", async () => {
    // Exit code when git rev-parse is executed outside
    // a git repository
    execaMock.mockReturnValueOnce({ exitCode: 128 });

    await addInitialCommit(testCwd);

    expect(execa).toHaveBeenCalledTimes(4);
    expect(execaMock.mock.calls).toEqual([
      [
        "git",
        ["rev-parse", "--is-inside-work-tree"],
        { cwd: testCwd, reject: false },
      ],
      ["git", ["init"], { cwd: testCwd }],
      ["git", ["add", "--all"], { cwd: testCwd }],
      [
        "git",
        ["commit", "-m", "Initialize project using coat create"],
        { cwd: testCwd },
      ],
    ]);
  });

  test("should not create a git repository, if cwd is already within another repository", async () => {
    execaMock.mockReturnValueOnce({ exitCode: 0 });

    await addInitialCommit(testCwd);

    expect(execa).toHaveBeenCalledTimes(1);
    expect(execa).toHaveBeenLastCalledWith(
      "git",
      ["rev-parse", "--is-inside-work-tree"],
      { cwd: testCwd, reject: false }
    );
  });

  test("should not create a git repository, if git cannot be found", async () => {
    execaMock.mockReturnValueOnce({ exitCode: 127 });

    await addInitialCommit(testCwd);

    expect(execa).toHaveBeenCalledTimes(1);
    expect(execa).toHaveBeenLastCalledWith(
      "git",
      ["rev-parse", "--is-inside-work-tree"],
      { cwd: testCwd, reject: false }
    );
  });
});
