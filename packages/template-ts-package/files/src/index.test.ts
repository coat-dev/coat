import { hello } from ".";

describe("index", () => {
  // TODO: Write your first tests

  test("hello should return Hello World", () => {
    expect(hello()).toBe("Hello World");
  });
});
