import {
  SourceLocation,
  Expression,
  ObjectProperty,
  isArrayExpression,
  isObjectExpression,
  isObjectProperty,
  isIdentifier,
  isStringLiteral,
} from "@babel/types";

/**
 * Adjusts a source location to correctly display the
 * helper characters for @babel/codeframe in a JSON AST.
 *
 * @param location The source location property of the AST or node
 * @returns The adjusted source location
 */
function shiftLocation(location: SourceLocation): SourceLocation {
  const singleLine = location.start.line === location.end.line;

  return {
    start: {
      ...location.start,
      column: location.start.column + 1,
    },
    end: {
      ...location.end,
      column: singleLine ? location.end.column + 1 : location.end.column,
    },
  };
}

/**
 * Returns the source location of a property path inside a JSON AST.
 *
 * @param ast The JSON AST parsed by @babel/parser
 * @param path The property path within the JSON object
 * @returns The source location
 */
export function getLocationInJSONAst(
  ast: Expression,
  path: (string | number)[]
): SourceLocation {
  const [head, ...tail] = path;

  if (typeof head === "undefined") {
    // The property path is empty, which means that the location
    // should describe the whole JSON value
    //
    if (!ast.loc) {
      throw new Error("AST does not have loc information.");
    }
    return shiftLocation(ast.loc);
  } else if (typeof head === "string") {
    if (!isObjectExpression(ast)) {
      throw new Error(
        `Expected ast root node to be ObjectExpression for current path: ${path.join(
          "."
        )}`
      );
    }

    // Find the desired property within the AST
    const desiredProperty = ast.properties
      .filter((prop): prop is ObjectProperty => isObjectProperty(prop))
      // Reverse the AST to prefer property declarations that follow later,
      // since JSON properties can be written multiple times and the
      // most recent declaration overwrites previous ones.
      .reverse()
      .find(
        (prop) =>
          // Typical JSON string literal, e.g.:
          // { "a": 1 }
          (isStringLiteral(prop.key) && prop.key.value === head) ||
          // JSON5 non-string identifier, e.g.:
          // { a: 1 }
          (isIdentifier(prop.key) && prop.key.name)
      );

    if (!desiredProperty) {
      throw new Error(
        `Could not find property for current path: ${path.join(".")}`
      );
    }

    if (tail.length) {
      return getLocationInJSONAst(desiredProperty.value as Expression, tail);
    }

    if (!desiredProperty.loc) {
      throw new Error(
        `Property does not have loc information for current path: ${path.join(
          "."
        )}`
      );
    }

    return shiftLocation(desiredProperty.loc);
  }

  if (!isArrayExpression(ast)) {
    throw new Error(
      `Expected ast root node to be ArrayExpression for current path: ${path.join(
        "."
      )}`
    );
  }

  const element = ast.elements[head];

  if (!element) {
    throw new Error(
      `Array element is not defined for current path: ${path.join(".")}`
    );
  }

  if (tail.length) {
    return getLocationInJSONAst(element as Expression, tail);
  }

  if (!element.loc) {
    throw new Error(
      `Element does not have loc information for current path: ${path.join(
        "."
      )}`
    );
  }

  return shiftLocation(element.loc);
}
