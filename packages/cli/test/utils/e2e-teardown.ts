import fs from "fs-extra";

export default async (): Promise<void> => {
  if (!process.env.COAT_CLI_TMP_E2E_PATH) {
    // Skip teardown, tmp directory is not defined
    return;
  }

  if (
    process.env.COAT_CLI_E2E_SESSION_TARBALL_PATH &&
    process.env.COAT_CLI_E2E_SESSION_TMP_PATH
  ) {
    // Skip teardown, since a test session has been created
    return;
  }

  const tmpDir = process.env.COAT_CLI_TMP_E2E_PATH;
  await fs.remove(tmpDir);
};
