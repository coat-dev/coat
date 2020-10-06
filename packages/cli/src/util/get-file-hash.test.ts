import { getFileHash } from "./get-file-hash";

describe("util/get-file-hash", () => {
  test("should return the base64 encoded SHA-3 512 has for a string", () => {
    const testString = "test";
    const testHash =
      "ns4IbpusSR+sXB0QRsoR1ze5KisuvZPwBde3EBEMCmeCiBZuf755aIOk8umzyp9IT1IdDORkNFzBrslneRScFA==";

    const result = getFileHash(testString);
    expect(result).toBe(testHash);
  });
});
