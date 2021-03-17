import leven from "leven";

/**
 * Finds a potential property misspelling using
 * the Levenshtein distance algorithm.
 *
 * @param targetProperty The unknown property that might have a spelling error
 * @param possibleProperties Potential properties that might have been misspelled
 * @returns The best matching property or null if none has been found
 */
export function findPotentialPropertyMatch(
  targetProperty: string,
  possibleProperties: string[]
): string | null {
  let bestPropertyMatch = { prop: "", distance: Infinity };

  for (const possibleProp of possibleProperties) {
    const distance = leven(targetProperty, possibleProp);
    if (distance < bestPropertyMatch.distance) {
      bestPropertyMatch = {
        prop: possibleProp,
        distance,
      };
    }
  }

  // We allow a maximum distance of 2 between strings to
  // not be too lax on offering a potential property match
  return bestPropertyMatch.distance < 3 ? bestPropertyMatch.prop : null;
}
