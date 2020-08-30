import fs from "fs-extra";
import path from "path";
import { vol } from "memfs";
import yaml from "js-yaml";
import { getCoatLockfile } from "./get-coat-lockfile";
import { COAT_LOCKFILE_FILENAME } from "../constants";

jest.mock("fs");

describe("util/get-coat-lockfile", () => {
  afterEach(() => {
    vol.reset();
  });
  const testCwd = "/test";

  test("should return undefined if lockfile doesn't exist", async () => {
    await expect(getCoatLockfile(testCwd)).resolves.toBeUndefined();
  });

  test("should return parsed lockfile if it exists", async () => {
    const lockfile = {
      version: 1,
      files: [
        {
          path: "a.json",
        },
      ],
    };
    const lockfileYaml = yaml.safeDump(lockfile);
    await fs.outputFile(
      path.join(testCwd, COAT_LOCKFILE_FILENAME),
      lockfileYaml
    );

    await expect(getCoatLockfile(testCwd)).resolves.toEqual(lockfile);
  });

  test(`should throw error if lockfile can't be accessed`, async () => {
    const lockfile = {
      version: 1,
      files: [
        {
          path: "a.json",
        },
      ],
    };
    const lockfileYaml = yaml.safeDump(lockfile);
    const lockfilePath = path.join(testCwd, COAT_LOCKFILE_FILENAME);
    await fs.outputFile(lockfilePath, lockfileYaml);
    await fs.chmod(lockfilePath, "000");

    await expect(getCoatLockfile(testCwd)).rejects.toMatchInlineSnapshot(
      `[Error: EACCES: permission denied, open '/test/coat.lock']`
    );
  });
});
