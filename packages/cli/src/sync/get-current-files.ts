import { promises as fs } from "fs";

/**
 * Returns the disk content for the given file paths if they exist.
 * If a file does not exist, the value for the path will be undefined.
 *
 * @param filePaths The files that shall be retrieved
 */
export async function getCurrentFiles(
  filePaths: string[]
): Promise<{ [filePath: string]: string | undefined }> {
  const currentFiles = await Promise.all(
    filePaths.map(async (filePath) => {
      // Try to retrieve the file contents
      try {
        const content = await fs.readFile(filePath, "utf-8");

        // Return the path and the content as a tuple
        // to match them back together later in an object
        return [filePath, content];
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          // File doesn't exist, return the key with an undefined content
          return [filePath];
        }

        // A different error occurred, e.g. missing read permissions
        // This error should be thrown back to the user
        throw error;
      }
    })
  );

  return Object.fromEntries(currentFiles);
}
