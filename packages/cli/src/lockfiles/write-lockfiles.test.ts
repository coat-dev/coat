import { promises as fs } from "fs";
import path from "path";
import yaml from "js-yaml";
import {
  COAT_GLOBAL_LOCKFILE_PATH,
  COAT_GLOBAL_LOCKFILE_VERSION,
  COAT_LOCAL_LOCKFILE_PATH,
  COAT_LOCAL_LOCKFILE_VERSION,
} from "../constants";
import { CoatContext } from "../types/coat-context";
import { getStrictCoatManifest } from "../util/get-strict-coat-manifest";
import {
  getStrictCoatGlobalLockfile,
  getStrictCoatLocalLockfile,
} from "./get-strict-coat-lockfiles";
import { writeGlobalLockfile, writeLocalLockfile } from "./write-lockfiles";

jest.mock("fs");

const platformRoot = path.parse(process.cwd()).root;
const testCwd = path.join(platformRoot, "test");

describe("lockfiles/write-lockfiles", () => {
  const context: CoatContext = {
    cwd: testCwd,
    coatManifest: getStrictCoatManifest({
      name: "test",
    }),
    packageJson: {},
    coatGlobalLockfile: getStrictCoatGlobalLockfile({
      version: COAT_GLOBAL_LOCKFILE_VERSION,
    }),
    coatLocalLockfile: getStrictCoatLocalLockfile({
      version: COAT_LOCAL_LOCKFILE_VERSION,
    }),
  };

  describe("global", () => {
    test("Should put lockfile at correct path", async () => {
      const lockfile = context.coatGlobalLockfile;
      await writeGlobalLockfile(lockfile, context);

      await fs.access(path.join(testCwd, COAT_GLOBAL_LOCKFILE_PATH));
    });

    test("should polish the yaml output", async () => {
      const lockfile = getStrictCoatGlobalLockfile({
        version: 1,
        setup: {
          task1: { result: [1, 23, { b: true }, 75] },
        },
        files: [
          {
            path: "bye.json",
            hash: "bye.json-hash",
          },
          {
            path: "hi.json",
            hash: "hi.json-hash",
          },
        ],
      });

      await writeGlobalLockfile(lockfile, context);

      const lockfileContent = await fs.readFile(
        path.join(testCwd, COAT_GLOBAL_LOCKFILE_PATH),
        "utf-8"
      );

      expect(lockfileContent).toMatchInlineSnapshot(`
        "files:
          - hash: bye.json-hash
            path: bye.json
          - hash: hi.json-hash
            path: hi.json
        setup:
          task1:
            result:
              - 1
              - 23
              - b: true
              - 75
        version: 1
        "
      `);
    });

    test("should strip empty files array", async () => {
      const lockfile = getStrictCoatGlobalLockfile({
        version: 1,
        files: [],
      });
      await writeGlobalLockfile(lockfile, context);

      const lockfileContent = await fs.readFile(
        path.join(testCwd, COAT_GLOBAL_LOCKFILE_PATH),
        "utf-8"
      );
      const newLockfile = yaml.load(lockfileContent);
      expect(newLockfile).not.toHaveProperty("files");
    });

    test("should only save once property for files where once = true", async () => {
      const lockfile = getStrictCoatGlobalLockfile({
        version: 1,
        files: [
          {
            path: "a.json",
            once: false,
            hash: "a.json-hash",
          },
          {
            path: "b.json",
            hash: "b.json-hash",
          },
          {
            path: "c.json",
            once: true,
          },
        ],
      });
      await writeGlobalLockfile(lockfile, context);

      const lockfileContent = await fs.readFile(
        path.join(testCwd, COAT_GLOBAL_LOCKFILE_PATH),
        "utf-8"
      );
      const newLockfile = yaml.load(lockfileContent);
      expect(newLockfile).toHaveProperty("files", [
        {
          path: "a.json",
          hash: "a.json-hash",
        },
        {
          path: "b.json",
          hash: "b.json-hash",
        },
        {
          path: "c.json",
          once: true,
        },
      ]);
    });

    test("should strip empty setup object", async () => {
      const lockfile = getStrictCoatGlobalLockfile({
        version: 1,
        setup: {},
      });
      await writeGlobalLockfile(lockfile, context);

      const lockfileContent = await fs.readFile(
        path.join(testCwd, COAT_GLOBAL_LOCKFILE_PATH),
        "utf-8"
      );
      const newLockfile = yaml.load(lockfileContent);
      expect(newLockfile).not.toHaveProperty("setup");
    });

    test.each`
      dependencyGroup
      ${"dependencies"}
      ${"devDependencies"}
      ${"optionalDependencies"}
      ${"peerDependencies"}
    `(
      "should strip empty $dependencyGroup property",
      async ({ dependencyGroup }) => {
        const lockfile = getStrictCoatGlobalLockfile({
          version: 1,
          dependencies: {
            dependencies: ["dependency"],
            devDependencies: ["devDependency"],
            optionalDependencies: ["optionalDependency"],
            peerDependencies: ["peerDependency"],
            [dependencyGroup]: [],
          },
        });
        await writeGlobalLockfile(lockfile, context);

        const lockfileContent = await fs.readFile(
          path.join(testCwd, COAT_GLOBAL_LOCKFILE_PATH),
          "utf-8"
        );
        const newLockfile = yaml.load(lockfileContent);
        expect(newLockfile).toHaveProperty("dependencies");
        expect(newLockfile).not.toHaveProperty(
          `dependencies.${dependencyGroup}`
        );
      }
    );

    test("should strip dependencies property if no dependency is tracked", async () => {
      const lockfile = getStrictCoatGlobalLockfile({
        version: 1,
        dependencies: {
          dependencies: [],
          devDependencies: [],
          optionalDependencies: [],
          peerDependencies: [],
        },
      });
      await writeGlobalLockfile(lockfile, context);

      const lockfileContent = await fs.readFile(
        path.join(testCwd, COAT_GLOBAL_LOCKFILE_PATH),
        "utf-8"
      );
      const newLockfile = yaml.load(lockfileContent);
      expect(newLockfile).not.toHaveProperty("dependencies");
    });
  });

  describe("local", () => {
    test("Should put lockfile at correct path", async () => {
      const lockfile = context.coatLocalLockfile;
      await writeLocalLockfile(lockfile, context);

      await fs.access(path.join(testCwd, COAT_LOCAL_LOCKFILE_PATH));
    });

    test("should polish the yaml output", async () => {
      const lockfile = getStrictCoatLocalLockfile({
        version: 1,
        setup: {
          task1: { result: [1, 23, { b: true }, 75] },
        },
        files: [
          {
            path: "bye.json",
            hash: "bye.json-hash",
          },
          {
            path: "hi.json",
            hash: "hi.json-hash",
          },
        ],
      });

      await writeLocalLockfile(lockfile, context);

      const lockfileContent = await fs.readFile(
        path.join(testCwd, COAT_LOCAL_LOCKFILE_PATH),
        "utf-8"
      );

      expect(lockfileContent).toMatchInlineSnapshot(`
        "files:
          - hash: bye.json-hash
            path: bye.json
          - hash: hi.json-hash
            path: hi.json
        setup:
          task1:
            result:
              - 1
              - 23
              - b: true
              - 75
        version: 1
        "
      `);
    });

    test("should strip empty files array", async () => {
      const lockfile = getStrictCoatLocalLockfile({
        version: 1,
        files: [],
      });
      await writeLocalLockfile(lockfile, context);

      const lockfileContent = await fs.readFile(
        path.join(testCwd, COAT_LOCAL_LOCKFILE_PATH),
        "utf-8"
      );
      const newLockfile = yaml.load(lockfileContent);
      expect(newLockfile).not.toHaveProperty("files");
    });

    test("should only save once property for files where once = true", async () => {
      const lockfile = getStrictCoatLocalLockfile({
        version: 1,
        files: [
          {
            path: "a.json",
            once: false,
            hash: "a.json-hash",
          },
          {
            path: "b.json",
            hash: "b.json-hash",
          },
          {
            path: "c.json",
            once: true,
          },
        ],
      });
      await writeLocalLockfile(lockfile, context);

      const lockfileContent = await fs.readFile(
        path.join(testCwd, COAT_LOCAL_LOCKFILE_PATH),
        "utf-8"
      );
      const newLockfile = yaml.load(lockfileContent);
      expect(newLockfile).toHaveProperty("files", [
        {
          path: "a.json",
          hash: "a.json-hash",
        },
        {
          path: "b.json",
          hash: "b.json-hash",
        },
        {
          path: "c.json",
          once: true,
        },
      ]);
    });

    test("should strip empty setup object", async () => {
      const lockfile = getStrictCoatLocalLockfile({
        version: 1,
        setup: {},
      });
      await writeLocalLockfile(lockfile, context);

      const lockfileContent = await fs.readFile(
        path.join(testCwd, COAT_LOCAL_LOCKFILE_PATH),
        "utf-8"
      );
      const newLockfile = yaml.load(lockfileContent);
      expect(newLockfile).not.toHaveProperty("setup");
    });
  });
});
