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
  COAT_LOCAL_LOCKFILE_PATH,
} from "../constants";
import { getFileHash } from "../util/get-file-hash";
import {
  getCoatGlobalLockfileValidator,
  getCoatLocalLockfileValidator,
} from "../util/get-validator";
import stripAnsi from "strip-ansi";

jest.mock("fs").mock("../util/get-validator");

const getCoatGlobalLockfileValidatorMock = (getCoatGlobalLockfileValidator as unknown) as jest.Mock<
  ReturnType<typeof getCoatGlobalLockfileValidator>,
  Parameters<typeof getCoatGlobalLockfileValidator>
>;

const getCoatLocalLockfileValidatorMock = (getCoatLocalLockfileValidator as unknown) as jest.Mock<
  ReturnType<typeof getCoatLocalLockfileValidator>,
  Parameters<typeof getCoatLocalLockfileValidator>
>;

const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {
  // Ignore console warn messages
});

describe("lockfiles/get-coat-lockfiles", () => {
  beforeEach(() => {
    getCoatGlobalLockfileValidatorMock.mockImplementation(async () => () =>
      true
    );
    getCoatLocalLockfileValidatorMock.mockImplementation(async () => () =>
      true
    );
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
              Object {
                "dependencies": Object {
                  "dependencies": Array [],
                  "devDependencies": Array [],
                  "optionalDependencies": Array [],
                  "peerDependencies": Array [],
                },
                "files": Array [],
                "scripts": Array [],
                "setup": Object {},
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
              Object {
                "dependencies": Object {
                  "dependencies": Array [],
                  "devDependencies": Array [],
                  "optionalDependencies": Array [],
                  "peerDependencies": Array [],
                },
                "files": Array [
                  Object {
                    "hash": "pp9zzKI6msXItWfcGFp1bpfJghZP4lhZ4NHcwUdcgKYVshI68fX5TBHj6UAsOsVY9QAZnZW20+MBdYWGKB3NJg==",
                    "once": false,
                    "path": "a.json",
                  },
                ],
                "scripts": Array [],
                "setup": Object {},
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
      getCoatGlobalLockfileValidatorMock.mockImplementation(async () => {
        const validate = (): boolean => false;
        validate.errors = [
          {
            keyword: "Error!",
            dataPath: "dataPath",
            schemaPath: "schemaPath",
            params: "params",
          },
        ];
        return validate;
      });

      await getCoatGlobalLockfile(testCwd);

      expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
      expect(stripAnsi(consoleWarnSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
        "Warning! The global lockfile coat.lock does not conform to the expected schema! Consider deleting and regenerating the lockfile in case you run into any issues.
        The following issues have been found:"
      `);
      expect(stripAnsi(consoleWarnSpy.mock.calls[1][0])).toMatchInlineSnapshot(`
        Array [
          Object {
            "dataPath": "dataPath",
            "keyword": "Error!",
            "params": "params",
            "schemaPath": "schemaPath",
          },
        ]
      `);
    });
  });

  describe("local", () => {
    test("should return empty lockfile if it doesn't exist", async () => {
      await expect(getCoatLocalLockfile(testCwd)).resolves
        .toMatchInlineSnapshot(`
              Object {
                "files": Array [],
                "setup": Object {},
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
              Object {
                "files": Array [
                  Object {
                    "hash": "pp9zzKI6msXItWfcGFp1bpfJghZP4lhZ4NHcwUdcgKYVshI68fX5TBHj6UAsOsVY9QAZnZW20+MBdYWGKB3NJg==",
                    "once": false,
                    "path": "a.json",
                  },
                ],
                "setup": Object {},
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
      getCoatLocalLockfileValidatorMock.mockImplementation(async () => {
        const validate = (): boolean => false;
        validate.errors = [
          {
            keyword: "Error!",
            dataPath: "dataPath",
            schemaPath: "schemaPath",
            params: "params",
          },
        ];
        return validate;
      });

      await getCoatLocalLockfile(testCwd);

      expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
      expect(stripAnsi(consoleWarnSpy.mock.calls[0][0])).toEqual(
        `Warning! The local lockfile ${COAT_LOCAL_LOCKFILE_PATH} does not conform to the expected schema! Consider deleting and regenerating the lockfile in case you run into any issues.\nThe following issues have been found:`
      );
      expect(stripAnsi(consoleWarnSpy.mock.calls[1][0])).toMatchInlineSnapshot(`
        Array [
          Object {
            "dataPath": "dataPath",
            "keyword": "Error!",
            "params": "params",
            "schemaPath": "schemaPath",
          },
        ]
      `);
    });
  });
});
