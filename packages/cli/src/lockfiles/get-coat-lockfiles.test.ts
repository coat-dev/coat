import fs from "fs-extra";
import path from "path";
import { vol } from "memfs";
import yaml from "js-yaml";
import {
  getCoatGlobalLockfile,
  getCoatLocalLockfile,
} from "./get-coat-lockfiles";
import {
  COAT_GLOBAL_LOCKFILE_PATH,
  COAT_GLOBAL_LOCKFILE_VERSION,
  COAT_LOCAL_LOCKFILE_PATH,
  COAT_LOCAL_LOCKFILE_VERSION,
} from "../constants";
import { getFileHash } from "../util/get-file-hash";
import stripAnsi from "strip-ansi";
import {
  validateCoatGlobalLockfile,
  validateCoatLocalLockfile,
} from "../generated/validators";
import { ValidateFunction } from "ajv";

jest.mock("fs").mock("../generated/validators");

const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {
  // Ignore console warn messages
});

type ValidatorMock = jest.Mock & ValidateFunction;

const validateGlobalLockfileMock =
  validateCoatGlobalLockfile as unknown as ValidatorMock;
const validateLocalLockfileMock =
  validateCoatLocalLockfile as unknown as ValidatorMock;

describe("lockfiles/get-coat-lockfiles", () => {
  beforeEach(() => {
    validateGlobalLockfileMock.mockReturnValue(true);
    validateLocalLockfileMock.mockReturnValue(true);
  });

  afterEach(() => {
    vol.reset();
    jest.clearAllMocks();
  });
  const testCwd = "/test";

  describe("global", () => {
    test("should return empty lockfile if it doesn't exist", async () => {
      await expect(getCoatGlobalLockfile(testCwd)).resolves
        .toMatchInlineSnapshot(`
        {
          "dependencies": {
            "dependencies": [],
            "devDependencies": [],
            "optionalDependencies": [],
            "peerDependencies": [],
          },
          "files": [],
          "scripts": [],
          "setup": {},
          "version": 1,
        }
      `);
    });

    test("should return parsed lockfile if it exists", async () => {
      const lockfile = {
        version: 1,
        files: [
          {
            path: "a.json",
            hash: getFileHash(""),
          },
        ],
      };
      const lockfileYaml = yaml.dump(lockfile);
      await fs.outputFile(
        path.join(testCwd, COAT_GLOBAL_LOCKFILE_PATH),
        lockfileYaml
      );

      await expect(getCoatGlobalLockfile(testCwd)).resolves
        .toMatchInlineSnapshot(`
        {
          "dependencies": {
            "dependencies": [],
            "devDependencies": [],
            "optionalDependencies": [],
            "peerDependencies": [],
          },
          "files": [
            {
              "hash": "pp9zzKI6msXItWfcGFp1bpfJghZP4lhZ4NHcwUdcgKYVshI68fX5TBHj6UAsOsVY9QAZnZW20+MBdYWGKB3NJg==",
              "once": false,
              "path": "a.json",
            },
          ],
          "scripts": [],
          "setup": {},
          "version": 1,
        }
      `);
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
      const lockfileYaml = yaml.dump(lockfile);
      const lockfilePath = path.join(testCwd, COAT_GLOBAL_LOCKFILE_PATH);
      await fs.outputFile(lockfilePath, lockfileYaml);
      await fs.chmod(lockfilePath, "000");

      await expect(
        getCoatGlobalLockfile(testCwd)
      ).rejects.toMatchInlineSnapshot(
        `[Error: EACCES: permission denied, open '/test/coat.lock']`
      );
    });

    test("should log warning if lockfile is not valid", async () => {
      validateGlobalLockfileMock.mockReturnValue(false);

      await getCoatGlobalLockfile(testCwd);

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(stripAnsi(consoleWarnSpy.mock.calls[0][0])).toMatchInlineSnapshot(
        `"Warning! The global lockfile coat.lock does not conform to the expected schema! Consider deleting and regenerating the lockfile by running coat sync in case you run into any issues."`
      );
    });

    test("should log warning if lockfile version is higher than the currently supported version", async () => {
      const lockfile = {
        version: COAT_GLOBAL_LOCKFILE_VERSION + 1,
      };
      const lockfileYaml = yaml.dump(lockfile);
      await fs.outputFile(
        path.join(testCwd, COAT_GLOBAL_LOCKFILE_PATH),
        lockfileYaml
      );

      await getCoatGlobalLockfile(testCwd);

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(stripAnsi(consoleWarnSpy.mock.calls[0][0])).toMatchInlineSnapshot(
        `"Warning! The global lockfile coat.lock version (2) is higher than the expected version (1) by the currently running cli. Please ensure that you are running the newest version of the @coat/cli since the current project might not be backwards compatible with the current cli version."`
      );
    });
  });

  describe("local", () => {
    test("should return empty lockfile if it doesn't exist", async () => {
      await expect(getCoatLocalLockfile(testCwd)).resolves
        .toMatchInlineSnapshot(`
        {
          "files": [],
          "setup": {},
          "version": 1,
        }
      `);
    });

    test("should return parsed lockfile if it exists", async () => {
      const lockfile = {
        version: 1,
        files: [
          {
            path: "a.json",
            hash: getFileHash(""),
          },
        ],
      };
      const lockfileYaml = yaml.dump(lockfile);
      await fs.outputFile(
        path.join(testCwd, COAT_LOCAL_LOCKFILE_PATH),
        lockfileYaml
      );

      await expect(getCoatLocalLockfile(testCwd)).resolves
        .toMatchInlineSnapshot(`
        {
          "files": [
            {
              "hash": "pp9zzKI6msXItWfcGFp1bpfJghZP4lhZ4NHcwUdcgKYVshI68fX5TBHj6UAsOsVY9QAZnZW20+MBdYWGKB3NJg==",
              "once": false,
              "path": "a.json",
            },
          ],
          "setup": {},
          "version": 1,
        }
      `);
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
      const lockfileYaml = yaml.dump(lockfile);
      const lockfilePath = path.join(testCwd, COAT_LOCAL_LOCKFILE_PATH);
      await fs.outputFile(lockfilePath, lockfileYaml);
      await fs.chmod(lockfilePath, "000");

      await expect(getCoatLocalLockfile(testCwd)).rejects.toMatchInlineSnapshot(
        `[Error: EACCES: permission denied, open '/test/.coat/coat.lock']`
      );
    });

    test("should log warning if lockfile is not valid", async () => {
      validateLocalLockfileMock.mockReturnValue(false);

      await getCoatLocalLockfile(testCwd);

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(stripAnsi(consoleWarnSpy.mock.calls[0][0])).toEqual(
        `Warning! The local lockfile ${COAT_LOCAL_LOCKFILE_PATH} does not conform to the expected schema! Consider deleting and regenerating the lockfile by running coat sync in case you run into any issues.`
      );
    });

    test("should log warning if lockfile version is higher than the currently supported version", async () => {
      const lockfile = {
        version: COAT_LOCAL_LOCKFILE_VERSION + 1,
      };
      const lockfileYaml = yaml.dump(lockfile);
      await fs.outputFile(
        path.join(testCwd, COAT_LOCAL_LOCKFILE_PATH),
        lockfileYaml
      );

      await getCoatLocalLockfile(testCwd);

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(stripAnsi(consoleWarnSpy.mock.calls[0][0])).toContain(
        `Warning! The local lockfile ${COAT_LOCAL_LOCKFILE_PATH} version (2) is higher than the expected version (1) by the currently running cli. Please ensure that you are running the newest version of the @coat/cli since the current project might not be backwards compatible with the current cli version.`
      );
    });
  });
});
