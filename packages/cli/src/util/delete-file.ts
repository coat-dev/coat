import { promises as fs } from "fs";

/**
 * Deletes a file if it exists.
 *
 * @param filePath Path to the file that will be deleted
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // The following block is removed from code coverage
    // since memfs currently has a bug in chmod that throws an
    // error when trying to modify folder permissions.
    // See: https://github.com/streamich/memfs/issues/558
    //
    // This block is however tested through the following integration
    // test in test/sync/delete-unmanaged-files.test.ts:
    // "should throw errors if unmanaged files cannot be accessed"
    /* istanbul ignore if */
    if (error.code !== "ENOENT") {
      // If there is an error other than the file not
      // being available (anymore) it is thrown
      throw error;
    }
  }
}
