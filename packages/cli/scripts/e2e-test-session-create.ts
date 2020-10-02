import fs from "fs-extra";
import chalk from "chalk";
import { buildE2ETestDir } from "../test/utils/e2e-setup";

async function main(): Promise<void> {
  // Remove previous tmp dir if it exists
  if (process.env.COAT_CLI_E2E_SESSION_TMP_PATH) {
    console.log("Removing previous e2e session directory");
    await fs.remove(process.env.COAT_CLI_E2E_SESSION_TMP_PATH);
  }

  const { tarballPath, tmpDirPath } = await buildE2ETestDir();
  const logLines = [
    "Setup finished. Run the following commands to skip setup for E2E test sessions:",
    "",
    `export COAT_CLI_E2E_SESSION_TARBALL_PATH=${tarballPath}`,
    `export COAT_CLI_E2E_SESSION_TMP_PATH=${tmpDirPath}`,
    "",
    `You can run the following command to tear down the test environment again: ${chalk.green(
      "npm run test:e2e-test-session-destroy"
    )}`,
    "",
  ];
  console.log(logLines.join("\n"));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
