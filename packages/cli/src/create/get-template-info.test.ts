import fs from "fs-extra";
import path from "path";
import importFrom from "import-from";
import { vol } from "memfs";
import ora from "ora";
import tmp from "tmp";
import execa from "execa";
import { getTemplateInfo } from "./get-template-info";
import { PACKAGE_JSON_FILENAME } from "../constants";

jest.mock("fs").mock("import-from").mock("execa").mock("ora");

const templatePackageJson = {
  name: "template",
  peerDependencies: {
    "peer-a": "^1.0.0",
  },
};

const importFromMock = (importFrom as unknown) as jest.Mock;
importFromMock.mockImplementation(() => templatePackageJson);

jest.spyOn(tmp, "dirSync").mockImplementation(() => ({
  name: "tmp-dir",
  removeCallback: jest.fn(),
}));

const execaMock = (execa as unknown) as jest.Mock;

describe("create/get-template-info", () => {
  afterEach(() => {
    vol.reset();
    jest.clearAllMocks();
  });

  const testSpinner = ora();

  test("should retrieve the template info from the created package.json", async () => {
    const cwd = "project-name";
    // Place project package.json file
    const projectPackageJson = {
      devDependencies: {
        template: "1.0.0",
      },
    };
    await fs.outputFile(
      path.join(cwd, "package.json"),
      JSON.stringify(projectPackageJson)
    );

    const templateInfo = await getTemplateInfo(
      cwd,
      {},
      "template",
      testSpinner
    );
    expect(templateInfo).toEqual(templatePackageJson);

    expect(importFromMock).toHaveBeenCalledTimes(1);
    expect(importFromMock).toHaveBeenLastCalledWith(
      "project-name",
      "template/package.json"
    );

    expect(execaMock).not.toHaveBeenCalled();
  });

  test("should install the template in a temporary directory if it has been installed in the project before", async () => {
    const cwd = "project-name";
    // Place project package.json file
    const projectPackageJson = {
      devDependencies: {
        template: "1.0.0",
      },
    };
    await fs.outputFile(
      path.join(cwd, "package.json"),
      JSON.stringify(projectPackageJson)
    );
    // Create the temporary directory
    await fs.mkdirp("tmp-dir");

    execaMock.mockImplementation(async () => {
      await fs.writeFile(
        path.join("tmp-dir", PACKAGE_JSON_FILENAME),
        JSON.stringify({
          name: "tmp-project-for-template-info",
          version: "1.0.0",
          devDependencies: {
            template: "1.0.0",
          },
        })
      );
    });

    const templateInfo = await getTemplateInfo(
      cwd,
      { devDependencies: { template: "1.0.0" } },
      "template",
      testSpinner
    );
    expect(templateInfo).toEqual(templatePackageJson);

    expect(execaMock).toHaveBeenCalledTimes(1);
    expect(execaMock).toHaveBeenLastCalledWith(
      "npm",
      ["install", "--save-exact", "--save-dev", "template"],
      { cwd: "tmp-dir" }
    );

    expect(importFromMock).toHaveBeenCalledTimes(1);
    expect(importFromMock).toHaveBeenLastCalledWith(
      "tmp-dir",
      "template/package.json"
    );
  });
});
