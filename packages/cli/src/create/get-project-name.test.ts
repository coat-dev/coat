import { getProjectName } from "./get-project-name";
import { prompt } from "inquirer";

jest.mock("inquirer");

((prompt as unknown) as jest.Mock).mockImplementation(() => ({
  projectName: "prompted-name",
}));

jest.spyOn(console, "warn").mockImplementation(() => {
  // Ignore console messages
});

describe("create/get-project-name", () => {
  test("should take specified project name if it is valid", async () => {
    const projectName = "project-name";
    const result = await getProjectName(projectName);
    expect(result).toBe(projectName);
  });

  test("should automatically trim specified project name without prompting the user", async () => {
    const projectName = "  project-name  ";
    const result = await getProjectName(projectName);
    expect(result).toBe("project-name");
  });

  test("should prompt the user if no project name is specified", async () => {
    const result = await getProjectName(undefined);
    expect(result).toBe("prompted-name");
  });

  test.each`
    projectName
    ${"My-Project"}
    ${"my$project"}
  `(
    "should warn user and prompt if specified project name ($projectName) is invalid",
    async ({ projectName }) => {
      (console.warn as jest.Mock).mockClear();

      const result = await getProjectName(projectName);
      expect(result).toBe("prompted-name");
      expect(console.warn).toHaveBeenCalledTimes(1);
      const warnArguments = (console.warn as jest.Mock).mock.calls[0];
      expect(warnArguments).toMatchSnapshot();
    }
  );
});
