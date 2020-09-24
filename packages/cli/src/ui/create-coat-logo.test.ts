import { createCoatLogo } from "./create-coat-logo";

// Does not contain any tests against the ASCII logo
// since assertions would be cumbersome and vary
// based on the test environment
describe("ui/create-coat-logo", () => {
  test("should include description", () => {
    expect(createCoatLogo()).toContain(
      "Declarative & continuous project configuration"
    );
  });

  test("should include website link", () => {
    expect(createCoatLogo()).toContain("https://coat.dev");
  });
});
