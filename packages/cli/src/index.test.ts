import * as cli from ".";

describe("@coat/cli - index", () => {
  test.each`
    functionName
    ${"create"}
    ${"run"}
    ${"setup"}
    ${"sync"}
  `("should export $functionName from index", ({ functionName }) => {
    expect(
      ((cli as unknown) as Record<string, unknown>)[functionName]
    ).toBeDefined();
  });

  test("should export types correctly", () => {
    // This is not a proper jest test, since jest does not check types.
    //
    // However linting would fail here if the types are no longer
    // exported from the index file
    const typeCheckObject: Partial<{
      coatContext: cli.CoatContext;
      coatManifest: cli.CoatManifest;
      coatTemplate: cli.CoatTemplate;
      coatManifestFileType: cli.CoatManifestFileType;
      coatManifestFile: cli.CoatManifestFile;
      coatManifestScript: cli.CoatManifestScript;
      coatManifestTask: cli.CoatManifestTask;
    }> = {};

    expect(typeCheckObject).toBeDefined();
  });
});
