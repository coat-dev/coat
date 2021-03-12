import chalk from "chalk";
import {
  getUsableTerminalSize,
  TerminalSize,
} from "../ui/get-usable-terminal-size";
import { getCoatHeader } from "./get-coat-header";

jest.mock("../ui/get-usable-terminal-size");

const getUsableTerminalSizeSpy = getUsableTerminalSize as jest.Mock<
  ReturnType<typeof getUsableTerminalSize>
>;

describe("create/print-create-customization-help", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getCoatHeader", () => {
    test("should return small header when terminal is tiny", () => {
      getUsableTerminalSizeSpy.mockReturnValue({
        size: TerminalSize.Tiny,
        width: 0,
      });

      const header = getCoatHeader();
      expect(header).toBe(chalk`\n🚀 {cyan coat} 🚀\n`);
    });

    test("should return full logo box when terminal is small", () => {
      getUsableTerminalSizeSpy.mockReturnValue({
        size: TerminalSize.Small,
        width: 58,
      });

      const header = getCoatHeader();
      // Only assert that console has been called
      // and that it has not been called with the small logo
      // since the logo box is too complex
      expect(header).not.toBe(chalk`\n🚀 {cyan coat} 🚀\n`);
    });
  });
});
