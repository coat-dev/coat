import { fillLastLine } from "./fill-last-line";

describe("ui/fill-last-line", () => {
  test("should add spaces to the last line until the length is reached", () => {
    const result = fillLastLine("1\n2\n3", 10);
    expect(result).toMatchInlineSnapshot(`
      "1
      2
      3         "
    `);
  });

  test("should leave last line untouched if it is already longer than the length", () => {
    const input = "1\n2\n34567";
    const result = fillLastLine(input, 2);
    expect(result).toBe(input);
  });
});
