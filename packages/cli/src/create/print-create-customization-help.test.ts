import {
  getUsableTerminalSize,
  TerminalSize,
} from "../ui/get-usable-terminal-size";
import { printCreateCustomizationHelp } from "./print-create-customization-help";

jest.mock("../ui/get-usable-terminal-size");

const consoleSpy = jest.spyOn(console, "log").mockImplementation(jest.fn());

const getUsableTerminalSizeSpy = getUsableTerminalSize as jest.Mock<
  ReturnType<typeof getUsableTerminalSize>
>;

describe("create/print-create-customization-help", () => {
  afterEach(() => {
    jest.clearAllMocks();
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
