import chalk from "chalk";
import {
  getUsableTerminalSize,
  TerminalSize,
} from "../ui/get-usable-terminal-size";
import { createCoatLogo } from "../ui/create-coat-logo";

/**
 * Returns the coat logo, description and the website url in
 * a pretty box.
 * On tiny terminal sizes, a shorter version is returned.
 */

export function getCoatHeader(): string {
  const usableTerminalSize = getUsableTerminalSize(process.stdout);

  if (usableTerminalSize.size === TerminalSize.Tiny) {
    const tinyLogo = `🚀 ${chalk.cyan("coat")} 🚀`;
    return `\n${tinyLogo}\n`;
  } else {
    return createCoatLogo();
  }
}
