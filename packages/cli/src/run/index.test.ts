import concurrently from "concurrently";
import { run } from ".";

jest.mock("concurrently");

const concurrentlyMock = concurrently as jest.Mock;

describe("run", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should prefix provided script patterns with npm:", async () => {
    const scripts = ["one", "two", "three:*"];
    await run(scripts);
    expect(concurrentlyMock).toHaveBeenCalledTimes(1);
    expect(concurrentlyMock.mock.calls[0][0]).toEqual(
      scripts.map((script) => `npm:${script}`)
    );
  });

  test("should call concurrently with kill options for failure", async () => {
    const scripts = ["one"];
    await run(scripts);

    expect(concurrentlyMock).toHaveBeenCalledTimes(1);
    expect(concurrentlyMock.mock.calls[0][1]).toEqual({
      killOthers: ["failure"],
    });
  });
});
