import {
  getUsableTerminalSize,
  TerminalSize,
} from "./get-usable-terminal-size";

describe("ui/get-usable-terminal-size", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should get small terminal size if stdout is not a TTY", () => {
    const stdout = {
      isTTY: false,
      rows: 0,
      columns: 0,
    };

    expect(getUsableTerminalSize(stdout)).toEqual({
      size: TerminalSize.Small,
      width: 58,
    });
  });

  test("should get tiny terminal size if there are not many rows", () => {
    const stdout = {
      isTTY: true,
      rows: 19,
      columns: 1000,
    };

    expect(getUsableTerminalSize(stdout)).toEqual({
      size: TerminalSize.Tiny,
      width: 0,
    });
  });

  test("should get tiny terminal size if there are not many columns", () => {
    const stdout = {
      isTTY: true,
      rows: 1000,
      columns: 79,
    };

    expect(getUsableTerminalSize(stdout)).toEqual({
      size: TerminalSize.Tiny,
      width: 0,
    });
  });

  test("should get small terminal size if there are less than 160 columns", () => {
    const stdout = {
      isTTY: true,
      rows: 1000,
      columns: 159,
    };

    expect(getUsableTerminalSize(stdout)).toEqual({
      size: TerminalSize.Small,
      width: 58,
    });
  });

  test("should get large terminal size if there are enough rows and columns", () => {
    const stdout = {
      isTTY: true,
      rows: 1000,
      columns: 1000,
    };

    expect(getUsableTerminalSize(stdout)).toEqual({
      size: TerminalSize.Large,
      width: 138,
    });
  });
});
