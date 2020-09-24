import stripAnsi from "strip-ansi";
import { getUsableTerminalSize } from "./get-usable-terminal-size";

/**
 * Centers all lines in the input text within the specified width.
 * Can handle colored text as well.
 *
 * @param text The line(s) that should be centered
 * @param width The full string width that should be filled
 */
export function centerText(text: string, width: number): string {
  // The max width should be limited to the current terminal size, in case
  // the passed width is larger
  const maxWidth = Math.min(getUsableTerminalSize(process.stdout).width, width);

  const lines = text.split("\n");

  return lines
    .map((line) => {
      // Calculate the necessary white space to
      // fill the line until the desired width
      const lineWhiteSpaceLength = (maxWidth - stripAnsi(line).length) / 2;

      // Create the white space by repeating a space.
      // If the line is longer than the width, an empty string is created
      const lineWhiteSpace = " ".repeat(Math.max(0, lineWhiteSpaceLength));

      // Place the line within whitespace
      return `${lineWhiteSpace}${line}${lineWhiteSpace}`;
    })
    .join("\n");
}
