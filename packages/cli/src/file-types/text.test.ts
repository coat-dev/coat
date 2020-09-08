import {
  COAT_GLOBAL_LOCKFILE_VERSION,
  COAT_LOCAL_LOCKFILE_VERSION,
} from "../constants";
import {
  getStrictCoatGlobalLockfile,
  getStrictCoatLocalLockfile,
} from "../lockfiles/get-strict-coat-lockfiles";
import { CoatContext } from "../types/coat-context";
import { getStrictCoatManifest } from "../util/get-strict-coat-manifest";
import { textFileFunctions } from "./text";

describe("file-types/text", () => {
  describe("merge", () => {
    test("should return target value without modification", () => {
      expect(textFileFunctions.merge(undefined, "target")).toBe("target");
      expect(textFileFunctions.merge(null, "target")).toBe("target");
      expect(textFileFunctions.merge("source", "target")).toBe("target");
    });
  });

  describe("polish", () => {
    const testContext: CoatContext = {
      cwd: "test-cwd",
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

    test("should add trailing new line if text ends without new line", () => {
      const content = "Text content";
      const polished = textFileFunctions.polish(
        content,
        "file.txt",
        testContext
      );
      expect(polished).toMatchInlineSnapshot(`
        "Text content
        "
      `);
    });

    test("should leave text unchanged if text already ends with a single new trailing new line", () => {
      const content = "Text content\n";
      const polished = textFileFunctions.polish(
        content,
        "file.txt",
        testContext
      );
      expect(content).toBe(polished);
      expect(polished).toMatchInlineSnapshot(`
        "Text content
        "
      `);
    });

    test("should merge multiple trailing new lines into single trailing new line", () => {
      const content = "Text content\n\n\n";
      const polished = textFileFunctions.polish(
        content,
        "file.txt",
        testContext
      );
      expect(polished).toMatchInlineSnapshot(`
        "Text content
        "
      `);
    });
  });
});
