import chalk from "chalk";
import {
  getUsableTerminalSize,
  TerminalSize,
} from "../ui/get-usable-terminal-size";
import {
  printCreateCustomizationHelp,
  printCreateHeader,
} from "./print-create-messages";

jest.mock("../ui/get-usable-terminal-size");

const consoleSpy = jest.spyOn(console, "log").mockImplementation(jest.fn());

const getUsableTerminalSizeSpy = getUsableTerminalSize as jest.Mock<
  ReturnType<typeof getUsableTerminalSize>
>;

describe("create/print-create-messages", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("printCreateHeader", () => {
    test("should print small header when terminal is tiny", () => {
      getUsableTerminalSizeSpy.mockReturnValue({
        size: TerminalSize.Tiny,
        width: 0,
      });

      printCreateHeader();
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenLastCalledWith(
        `\n🚀 ${chalk.cyan("coat")} 🚀`
      );
    });

    test("should print full logo box when terminal is small", () => {
      getUsableTerminalSizeSpy.mockReturnValue({
        size: TerminalSize.Small,
        width: 58,
      });

      printCreateHeader();
      // Only assert that console has been called
      // and that it has not been called with the small logo
      // since the logo box is too complex
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).not.toHaveBeenCalledWith(
        `\n🚀 ${chalk.cyan("coat")} 🚀`
      );
    });
  });

  describe("printCreateCustomizationHelp", () => {
    test("should not print out anything if terminal is tiny", () => {
      getUsableTerminalSizeSpy.mockReturnValue({
        size: TerminalSize.Tiny,
        width: 0,
      });

      printCreateCustomizationHelp();

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    test("should print out customization help if terminal is larger", () => {
      getUsableTerminalSizeSpy.mockReturnValue({
        size: TerminalSize.Small,
        width: 58,
      });

      printCreateCustomizationHelp();

      // Only assert that console has been called,
      // since the customization help text box is
      // too complex and too varied between environments
      // to make sane assumptions
      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });
  });
});
