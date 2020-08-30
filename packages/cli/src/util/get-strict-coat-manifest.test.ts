import { getStrictCoatManifest } from "./get-strict-coat-manifest";
import { CoatManifest } from "../types/coat-manifest";
import { CoatManifestFileType } from "../types/coat-manifest-file";

describe("util/get-strict-coat-manifest", () => {
  test("should add extends array if extends is undefined", () => {
    const manifest: CoatManifest = {
      name: "manifest",
    };
    const result = getStrictCoatManifest(manifest);
    expect(result).toHaveProperty("extends", []);
  });

  test("should create extends array if extends is a string", () => {
    const manifest: CoatManifest = {
      name: "manifest",
      extends: "template",
    };
    const result = getStrictCoatManifest(manifest);
    expect(result).toHaveProperty("extends", ["template"]);
  });

  test(`should leave extends array alone if it's already an array`, () => {
    const manifest: CoatManifest = {
      name: "manifest",
      extends: ["template", "template-2"],
    };
    const result = getStrictCoatManifest(manifest);
    expect(result).toHaveProperty("extends", ["template", "template-2"]);
  });

  test("should create files array if files is undefined", () => {
    const manifest: CoatManifest = {
      name: "manifest",
    };
    const result = getStrictCoatManifest(manifest);
    expect(result).toHaveProperty("files", []);
  });

  test(`should leave files array alone if it's already an array`, () => {
    const manifest: CoatManifest = {
      name: "manifest",
      files: [
        { file: "path", type: CoatManifestFileType.Json, content: {} },
        {
          file: "path-2",
          type: CoatManifestFileType.Json,
          content: { a: true },
        },
      ],
    };
    const result = getStrictCoatManifest(manifest);
    expect(result).toHaveProperty("files", [
      { file: "path", type: CoatManifestFileType.Json, content: {} },
      { file: "path-2", type: CoatManifestFileType.Json, content: { a: true } },
    ]);
  });

  test("should create dependencies map if dependencies is undefined", () => {
    const manifest: CoatManifest = {
      name: "manifest",
    };
    const result = getStrictCoatManifest(manifest);
    expect(result).toHaveProperty("dependencies", {});
  });

  test(`should leave dependencies map alone if it's already an object`, () => {
    const manifest: CoatManifest = {
      name: "manifest",
      dependencies: {
        devDependencies: {
          lodash: "1.0.0",
        },
        optionalDependencies: {
          macro: "1.0.0",
        },
      },
    };
    const result = getStrictCoatManifest(manifest);
    expect(result).toHaveProperty("dependencies", {
      optionalDependencies: {
        macro: "1.0.0",
      },
      devDependencies: {
        lodash: "1.0.0",
      },
    });
  });

  test("should create scripts array if scripts is undefined", () => {
    const manifest: CoatManifest = {
      name: "manifest",
    };
    const result = getStrictCoatManifest(manifest);
    expect(result).toHaveProperty("scripts", []);
  });

  test(`should leave scripts array alone if it's already an array`, () => {
    const manifest: CoatManifest = {
      name: "manifest",
      scripts: [
        {
          id: "id",
          run: "test",
          scriptName: "test",
        },
        {
          id: "id2",
          run: "build",
          scriptName: "build",
        },
      ],
    };
    const result = getStrictCoatManifest(manifest);
    expect(result).toHaveProperty("scripts", [
      {
        id: "id",
        run: "test",
        scriptName: "test",
      },
      {
        id: "id2",
        run: "build",
        scriptName: "build",
      },
    ]);
  });

  test("should create setup array if setup is undefined", () => {
    const manifest: CoatManifest = {
      name: "manifest",
    };
    const result = getStrictCoatManifest(manifest);
    expect(result).toHaveProperty("setup", []);
  });

  test("should leave setup array alone if it's already an Array", () => {
    const manifest: CoatManifest = {
      name: "manifest",
      setup: [
        {
          id: "task1",
          run: () => ({}),
        },
      ],
    };
    const result = getStrictCoatManifest(manifest);
    expect(result.setup).toBe(manifest.setup);
  });
});
