/**
 * Fills the last line until the specified width is reached
 * to align strings to the same length.
 * (e.g. to have boxes around text that have the same size)
 *
 * @param input The string that should be aligned
 * @param width The total width that should be reached
 */
export function fillLastLine(input: string, width: number): string {
  const lines = input.split("\n");
  const lastLine = lines[lines.length - 1];

  // Adds white space to the last line in case
  // the desired width has not yet been reached
  const newLastLine = `${lastLine}${" ".repeat(
    Math.max(0, width - lastLine.length)
  )}`;

  return [...lines.slice(0, lines.length - 1), newLastLine].join("\n");
}
