import chalk from "chalk";
import { formatPropertyPath } from "./format-property-path";

describe("validation/format-property-path", () => {
  test("should work with an empty property path", () => {
    expect(formatPropertyPath([])).toBe("");
  });

  test("should format a deep path with array access", () => {
    expect(formatPropertyPath(["a", "b", 1, "c"])).toBe(
      chalk`{green a.b[1].c:}`
    );
  });

  test("should quote necessary properties", () => {
    expect(
      formatPropertyPath(["a", "@scoped/value", 1, "@another/scope"])
    ).toBe(chalk`{green a['@scoped/value'][1]['@another/scope']:}`);
  });
});
