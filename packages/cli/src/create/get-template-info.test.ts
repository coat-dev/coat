import { promises as fs } from "fs";
import path from "path";
import importFrom from "import-from";
import { getTemplateInfo } from "./get-template-info";

jest.mock("fs").mock("import-from");

const templatePackageJson = {
  peerDependencies: {
    "peer-a": "^1.0.0",
  },
};
((importFrom as unknown) as jest.Mock).mockImplementation(
  () => templatePackageJson
);

describe("create/get-template-info", () => {
  test("should retrieve the template info from the created package.json", async () => {
    const cwd = "project-name";
    // Place project package.json file
    const projectPackageJson = {
      devDependencies: {
        template: "1.0.0",
      },
    };
    await fs.mkdir(cwd, { recursive: true });
    await fs.writeFile(
      path.join(cwd, "package.json"),
      JSON.stringify(projectPackageJson)
    );

    const templateInfo = await getTemplateInfo(cwd);
    expect(templateInfo).toEqual(templatePackageJson);
  });
});
