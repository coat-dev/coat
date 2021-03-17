import { findPotentialPropertyMatch } from "./find-potential-property-match";

describe("validation/find-potential-property-match", () => {
  test("should return a suggestion for a potential property match", () => {
    const property = "target";
    const possibleProperties = ["tarrget", "testy", "test-property-2"];

    expect(findPotentialPropertyMatch(property, possibleProperties)).toBe(
      "tarrget"
    );
  });

  test("should not return a suggestion if all properties are too far away", () => {
    const property = "target";
    const possibleProperties = ["testy", "test-property-2"];

    expect(findPotentialPropertyMatch(property, possibleProperties)).toBe(null);
  });
});
