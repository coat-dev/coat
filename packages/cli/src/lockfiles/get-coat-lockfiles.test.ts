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

jest.mock("fs");

describe("lockfiles/get-coat-lockfiles", () => {
  afterEach(() => {
    vol.reset();
  });
  const testCwd = "/test";

  describe("global", () => {
    test("should return empty lockfile if it doesn't exist", async () => {
      await expect(getCoatGlobalLockfile(testCwd)).resolves
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
      const lockfileYaml = yaml.safeDump(lockfile);
      await fs.outputFile(
        path.join(testCwd, COAT_GLOBAL_LOCKFILE_PATH),
        lockfileYaml
      );

      await expect(getCoatGlobalLockfile(testCwd)).resolves
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
      const lockfileYaml = yaml.safeDump(lockfile);
      const lockfilePath = path.join(testCwd, COAT_GLOBAL_LOCKFILE_PATH);
      await fs.outputFile(lockfilePath, lockfileYaml);
      await fs.chmod(lockfilePath, "000");

      await expect(
        getCoatGlobalLockfile(testCwd)
      ).rejects.toMatchInlineSnapshot(
        `[Error: EACCES: permission denied, open '/test/coat.lock']`
      );
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
      const lockfileYaml = yaml.safeDump(lockfile);
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
      const lockfileYaml = yaml.safeDump(lockfile);
      const lockfilePath = path.join(testCwd, COAT_LOCAL_LOCKFILE_PATH);
      await fs.outputFile(lockfilePath, lockfileYaml);
      await fs.chmod(lockfilePath, "000");

      await expect(getCoatLocalLockfile(testCwd)).rejects.toMatchInlineSnapshot(
        `[Error: EACCES: permission denied, open '/test/.coat/coat.lock']`
      );
    });
  });
});
