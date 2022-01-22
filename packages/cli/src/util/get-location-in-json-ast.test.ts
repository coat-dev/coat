import { parseExpression } from "@babel/parser";
import { cloneDeepWithoutLoc } from "@babel/types";
import { getLocationInJSONAst } from "./get-location-in-json-ast";

describe("util/get-location-in-json-ast", () => {
  test("should throw an object if root ast is not an object", () => {
    const source = JSON.stringify(123);
    const ast = parseExpression(source);

    expect(() =>
      getLocationInJSONAst(ast, ["any"])
    ).toThrowErrorMatchingInlineSnapshot(
      `"Expected ast root node to be ObjectExpression for current path: any"`
    );
  });

  test("should throw error if property cannot be found", () => {
    const source = JSON.stringify({ a: 1 });
    const ast = parseExpression(source);

    expect(() =>
      getLocationInJSONAst(ast, ["b"])
    ).toThrowErrorMatchingInlineSnapshot(
      `"Could not find property for current path: b"`
    );
  });

  test("should throw error if loc information cannot be found", () => {
    const source = JSON.stringify({ a: 1 });
    const ast = cloneDeepWithoutLoc(parseExpression(source));

    expect(() =>
      getLocationInJSONAst(ast, ["a"])
    ).toThrowErrorMatchingInlineSnapshot(
      `"Property does not have loc information for current path: a"`
    );
  });

  test("should throw error if path expects array but finds an object", () => {
    const source = JSON.stringify({ a: { b: true } });
    const ast = parseExpression(source);

    expect(() =>
      getLocationInJSONAst(ast, ["a", 0])
    ).toThrowErrorMatchingInlineSnapshot(
      `"Expected ast root node to be ArrayExpression for current path: 0"`
    );
  });

  test("should throw error if path expects an array element, but index is out of bounds", () => {
    const source = JSON.stringify({ a: { b: [1, 2, 3] } });
    const ast = parseExpression(source);

    expect(() =>
      getLocationInJSONAst(ast, ["a", "b", 3])
    ).toThrowErrorMatchingInlineSnapshot(
      `"Array element is not defined for current path: 3"`
    );
  });

  test("should throw error if loc information of an array element cannot be found", () => {
    const source = JSON.stringify({ a: { b: [1, 2, 3] } });
    const ast = cloneDeepWithoutLoc(parseExpression(source));

    expect(() =>
      getLocationInJSONAst(ast, ["a", "b", 1])
    ).toThrowErrorMatchingInlineSnapshot(
      `"Element does not have loc information for current path: 1"`
    );
  });

  test("should return deep property path", () => {
    const source = JSON.stringify(
      { a: { b: { c: [0, 1, 2, { d: true }] } } },
      null,
      2
    );
    const ast = parseExpression(source);

    const location = getLocationInJSONAst(ast, ["a", "b", "c", 3, "d"]);

    expect(location).toMatchInlineSnapshot(`
      Object {
        "end": Object {
          "column": 20,
          "index": undefined,
          "line": 9,
        },
        "start": Object {
          "column": 11,
          "index": undefined,
          "line": 9,
        },
      }
    `);
  });

  test("should return deep array element", () => {
    const source = JSON.stringify(
      { a: { b: { c: [0, 1, 2, { d: ["a", "b", "c"] }] } } },
      null,
      2
    );
    const ast = parseExpression(source);

    const location = getLocationInJSONAst(ast, ["a", "b", "c", 3, "d", 1]);

    expect(location).toMatchInlineSnapshot(`
      Object {
        "end": Object {
          "column": 16,
          "index": undefined,
          "line": 11,
        },
        "start": Object {
          "column": 13,
          "index": undefined,
          "line": 11,
        },
      }
    `);
  });

  test("should return multi line location info for a larger object", () => {
    const source = JSON.stringify(
      { a: { b: { c: [0, 1, 2, { d: ["a", "b", "c"] }] } } },
      null,
      2
    );
    const ast = parseExpression(source);

    const location = getLocationInJSONAst(ast, ["a", "b", "c"]);

    expect(location).toMatchInlineSnapshot(`
      Object {
        "end": Object {
          "column": 7,
          "index": undefined,
          "line": 15,
        },
        "start": Object {
          "column": 7,
          "index": undefined,
          "line": 4,
        },
      }
    `);
  });

  test("should return full AST location is property path is empty", () => {
    const source = JSON.stringify(
      { a: { b: { c: [0, 1, 2, { d: ["a", "b", "c"] }] } } },
      null,
      2
    );
    const ast = parseExpression(source);

    const location = getLocationInJSONAst(ast, []);

    expect(location).toMatchInlineSnapshot(`
      Object {
        "end": Object {
          "column": 1,
          "index": undefined,
          "line": 18,
        },
        "start": Object {
          "column": 1,
          "index": undefined,
          "line": 1,
        },
      }
    `);
  });

  test("should throw an error if full AST location should be returned but loc information is missing", () => {
    const source = JSON.stringify(
      { a: { b: { c: [0, 1, 2, { d: ["a", "b", "c"] }] } } },
      null,
      2
    );
    const ast = cloneDeepWithoutLoc(parseExpression(source));

    expect(() =>
      getLocationInJSONAst(ast, [])
    ).toThrowErrorMatchingInlineSnapshot(
      `"AST does not have loc information."`
    );
  });

  test("should work with a non-string property identifier (JSON5)", () => {
    const source = `{
      a: {
        b: 5
      }
    }`;
    const ast = parseExpression(source);

    const location = getLocationInJSONAst(ast, ["a", "b"]);
    expect(location).toMatchInlineSnapshot(`
      Object {
        "end": Object {
          "column": 13,
          "index": undefined,
          "line": 3,
        },
        "start": Object {
          "column": 9,
          "index": undefined,
          "line": 3,
        },
      }
    `);
  });
});
