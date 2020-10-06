import fs from "fs-extra";
import { vol } from "memfs";
import path from "path";
import { PACKAGE_JSON_FILENAME } from "../constants";
import { getPackageJson } from "./get-package-json";

jest.mock("fs");

const platformRoot = path.parse(process.cwd()).root;
const testCwd = path.join(platformRoot, "test");

const packageJsonPath = path.join(testCwd, PACKAGE_JSON_FILENAME);

describe("util/get-package-json", () => {
  afterEach(() => {
    vol.reset();
  });

  test("should return and parse package.json if it exists", async () => {
    const packageJson = {
      name: "test",
    };
    await fs.outputFile(packageJsonPath, JSON.stringify(packageJson));

    await expect(getPackageJson(testCwd)).resolves.toEqual(packageJson);
  });

  test("should return undefined if no package.json exists", async () => {
    await expect(getPackageJson(testCwd)).resolves.toBeUndefined();
  });

  test("should throw an error if package.json cannot be read", async () => {
    const packageJson = {
      name: "test",
    };
    await fs.outputFile(packageJsonPath, JSON.stringify(packageJson));
    await fs.chmod(packageJsonPath, "222");

    await expect(getPackageJson(testCwd)).rejects.toHaveProperty(
      "message",
      expect.stringMatching(/EACCES: permission denied, open '.*package.json'/)
    );
  });

  test("should throw an error if package.json cannot be parsed", async () => {
    await fs.outputFile(packageJsonPath, "undefined");

    await expect(getPackageJson(testCwd)).rejects.toHaveProperty(
      "message",
      "Unexpected token u in JSON at position 0"
    );
  });
});
