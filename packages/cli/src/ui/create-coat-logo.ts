import boxen from "boxen";
import chalk from "chalk";
import { centerText } from "./center-text";
import { COAT_ASCII_LOGO, COAT_LOGO_BOX_WIDTH } from "../constants";

/**
 * Creates a box with the coat logo, description
 * and a link to the coat website
 */
export function createCoatLogo(): string {
  const text = [
    centerText(COAT_ASCII_LOGO, COAT_LOGO_BOX_WIDTH),
    "",
    chalk.dim.green("─".repeat(COAT_LOGO_BOX_WIDTH)),
    "",
    centerText(
      "Declarative & continuous project configuration",
      COAT_LOGO_BOX_WIDTH
    ),
    centerText(chalk.cyan("https://coat.dev"), COAT_LOGO_BOX_WIDTH),
    "",
  ].join("\n");

  // Place the logo and descriptions into a box
  const logoBox = boxen(text, {
    dimBorder: true,
    borderColor: "green",
    float: "center",
  });

  return logoBox;
}
