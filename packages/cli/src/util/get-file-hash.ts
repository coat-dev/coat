import SHA3 from "sha3";

/**
 * Calculates the SHA3-512 hash of and returns it in base64 encoding
 *
 * @param content The string that should be hashed
 */
export function getFileHash(content: string): string {
  return new SHA3(512).update(content).digest("base64");
}
