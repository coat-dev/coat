import { polishFiles } from "./polish-files";
import { CoatContext } from "../types/coat-context";
import { getStrictCoatManifest } from "../util/get-strict-coat-manifest";
import {
  getStrictCoatGlobalLockfile,
  getStrictCoatLocalLockfile,
} from "../lockfiles/get-strict-coat-lockfiles";
import {
  COAT_GLOBAL_LOCKFILE_VERSION,
  COAT_LOCAL_LOCKFILE_VERSION,
} from "../constants";
import { CoatManifestFileType } from "../types/coat-manifest-file";

describe("sync/polish-files", () => {
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

  test("should throw an error for unknown file types", () => {
    expect(() =>
      polishFiles(
        [
          {
            // @ts-expect-error
            type: "UNKNOWN",
            content: { astra: "1,2,3" },
            file: "filename.unknown",
          },
        ],
        testContext
      )
    ).toThrowErrorMatchingInlineSnapshot(
      `"Cannot polish unknown file type: UNKNOWN"`
    );
  });

  test("should return content as string", () => {
    const polishedFiles = polishFiles(
      [
        {
          type: CoatManifestFileType.Json,
          content: { a: true },
          file: "/file.json",
          local: false,
          relativePath: "file.json",
          once: false,
        },
      ],
      testContext
    );
    expect(typeof polishedFiles[0].content).toBe("string");
  });
});
