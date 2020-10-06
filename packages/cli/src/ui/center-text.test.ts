import chalk from "chalk";
import { centerText } from "./center-text";

describe("ui/center-text", () => {
  test("should center single line", () => {
    const result = centerText("abc", 12);
    expect(result).toMatchInlineSnapshot(`"    abc    "`);
  });

  test("should center multiple lines", () => {
    const result = centerText("abc\nab", 12);
    expect(result).toMatchInlineSnapshot(`
      "    abc    
           ab     "
    `);
  });

  test("should leave string untouched if width is smaller than the input string length", () => {
    const input = "abcdefghijk";
    const result = centerText(input, 5);
    expect(result).toBe(input);
  });

  test("should work with colored inputs", () => {
    const result = centerText(chalk.dim.cyan("test"), 6);
    expect(result).toEqual(` ${chalk.dim.cyan("test")} `);
  });
});
