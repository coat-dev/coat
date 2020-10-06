import fs from "fs-extra";

async function main(): Promise<void> {
  if (!process.env.COAT_CLI_E2E_SESSION_TMP_PATH) {
    throw new Error(
      "Environment variable COAT_CLI_E2E_SESSION_TMP_PATH has to be defined in order to destroy a test session"
    );
  }

  await fs.remove(process.env.COAT_CLI_E2E_SESSION_TMP_PATH);

  const logLines = [
    "Destroy complete. Run the following commands to unset the e2e test session environment variables",
    "",
    "unset COAT_CLI_E2E_SESSION_TARBALL_PATH",
    "unset COAT_CLI_E2E_SESSION_TMP_PATH",
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
