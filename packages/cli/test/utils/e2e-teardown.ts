import fs from "fs-extra";

export default async (): Promise<void> => {
  if (!process.env.COAT_CLI_TMP_E2E_PATH) {
    // Skip teardown, tmp directory is not defined
    return;
  }

  const tmpDir = process.env.COAT_CLI_TMP_E2E_PATH;
  await fs.remove(tmpDir);
};