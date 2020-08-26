import { mergeScripts } from "./merge-scripts";

describe("sync/merge-scripts", () => {
  test("should work with empty scripts array", () => {
    const result = mergeScripts([]);
    expect(result).toEqual({});
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
    expect(result).toEqual({
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
    expect(result).toEqual({
      build: "build",
      test: "run-p test:*",
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
    expect(result).toEqual({
      build: "build",
      test: "run-p test:*",
      "test:1": "test1",
      "test:3": "test2",
      "test:4": "test4",
    });
  });
});
