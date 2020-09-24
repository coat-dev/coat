export enum TerminalSize {
  Tiny,
  Small,
  Large,
}

const terminalWidths = {
  [TerminalSize.Tiny]: 0,
  [TerminalSize.Small]: 58,
  [TerminalSize.Large]: 138,
};

/**
 * Retrieves the usable terminal size that is used
 * for formatted output like boxes or larger text blocks.
 *
 * @param stdout The output stream, typically process.stdout
 */
export function getUsableTerminalSize(stdout: {
  isTTY: boolean;
  rows: number;
  columns: number;
}): { size: TerminalSize; width: number } {
  let size: TerminalSize;

  if (!stdout.isTTY) {
    // When piping output, the resulting logs should
    // adhere to a "small" terminal size
    size = TerminalSize.Small;
  } else if (stdout.rows < 20) {
    // If there only are a few visible rows in the terminal,
    // the size should be tiny to not overwhelm the terminal logs
    size = TerminalSize.Tiny;
  } else if (stdout.columns >= 160) {
    size = TerminalSize.Large;
  } else if (stdout.columns >= 80) {
    size = TerminalSize.Small;
  } else {
    // If there are less than 80 columns available
    // the output should be condensed and not overwhelm
    // the terminal log
    size = TerminalSize.Tiny;
  }

  return {
    size,
    width: terminalWidths[size],
  };
}
