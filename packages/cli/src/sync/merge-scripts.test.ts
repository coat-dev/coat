import { mergeScripts } from "./merge-scripts";

describe("sync/merge-scripts", () => {
  test("should work with empty scripts array", () => {
    const result = mergeScripts([]);
    expect(result.scripts).toEqual({});
  });

  test("should take over scriptName if it is unique in the array", () => {
    const result = mergeScripts([
      [
        {
          id: "1",
          scriptName: "test",
          run: "test",
        },
        {
          id: "2",
          scriptName: "build",
          run: "build",
        },
        {
          id: "3",
          scriptName: "lint",
          run: "lint",
        },
      ],
    ]);
    expect(result.scripts).toEqual({
      test: "test",
      build: "build",
      lint: "lint",
    });
  });

  test("should group scripts if a scriptName exists multiple times", () => {
    const result = mergeScripts([
      [
        {
          id: "1",
          scriptName: "test",
          run: "test1",
        },
        {
          id: "2",
          scriptName: "build",
          run: "build",
        },
        {
          id: "3",
          scriptName: "test",
          run: "test2",
        },
      ],
      [
        {
          id: "4",
          scriptName: "test",
          run: "test4",
        },
      ],
    ]);
    expect(result.scripts).toEqual({
      build: "build",
      test: "coat run test:*",
      "test:1": "test1",
      "test:3": "test2",
      "test:4": "test4",
    });
  });

  test("should remove scriptName from resulting grouped script if it is contained in the id of a script", () => {
    const result = mergeScripts([
      [
        {
          id: "1",
          scriptName: "test",
          run: "test1",
        },
        {
          id: "2",
          scriptName: "build",
          run: "build",
        },
        {
          id: "test-3",
          scriptName: "test",
          run: "test2",
        },
      ],
      [
        {
          id: "4",
          scriptName: "test",
          run: "test4",
        },
      ],
    ]);
    expect(result.scripts).toEqual({
      build: "build",
      test: "coat run test:*",
      "test:1": "test1",
      "test:3": "test2",
      "test:4": "test4",
    });
  });

  test("should use latest entry in scripts array if multiple scripts share the same id", () => {
    const result = mergeScripts([
      [
        {
          id: "test",
          run: "test1",
          scriptName: "test",
        },
        {
          id: "test",
          run: "test2",
          scriptName: "test2",
        },
      ],
      [
        {
          id: "test",
          run: "test3",
          scriptName: "test",
        },
      ],
    ]);
    expect(result.scripts).toEqual({
      test: "test3",
    });
  });
});
