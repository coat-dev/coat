import {
  getProjectName,
  sanitizeProjectName,
  validateProjectName,
} from "./get-project-name";
import { prompt } from "inquirer";

jest.mock("inquirer");

const promptMock = prompt as unknown as jest.Mock;
promptMock.mockImplementation(() => ({
  projectName: "prompted-name",
}));

describe("create/get-project-name", () => {
  describe("get-project-name", () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    test("should prompt the user with the suggested project name", async () => {
      const result = await getProjectName("suggested-project-name");
      expect(result).toBe("prompted-name");

      expect(promptMock).toHaveBeenCalledTimes(1);
      expect(promptMock).toHaveBeenLastCalledWith([
        {
          default: "suggested-project-name",
          filter: expect.any(Function),
          message: "Enter the name of your new project",
          name: "projectName",
          validate: expect.any(Function),
        },
      ]);
    });

    test("should prompt the user with my-project as the suggestion if no suggestion is specified", async () => {
      const result = await getProjectName();
      expect(result).toBe("prompted-name");

      expect(promptMock).toHaveBeenCalledTimes(1);
      expect(promptMock).toHaveBeenLastCalledWith([
        {
          default: "my-project",
          filter: expect.any(Function),
          message: "Enter the name of your new project",
          name: "projectName",
          validate: expect.any(Function),
        },
      ]);
    });
  });

  describe("sanitizeProjectName", () => {
    test("should trim both the start and end of the input", () => {
      expect(sanitizeProjectName("   name ")).toBe("name");
    });
  });

  describe("validateProjectName", () => {
    test("should return true if the project name is not an empty string", () => {
      expect(validateProjectName("a")).toBe(true);
    });

    test("should return false for an empty string", () => {
      expect(validateProjectName("")).toBe(false);
    });
  });
});
