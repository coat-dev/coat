import path from "path";
import execa from "execa";
import { version } from "../../package.json";
import { getTmpDir } from "./get-tmp-dir";

// Packs and installs the cli in
// a temporary directory in order to run
// the integration tests in an environment
// which mirrors a coat users actual development
// environment
export default async (): Promise<void> => {
  const packageRootDir = path.join(__dirname, "..", "..");
  const tmpDir = getTmpDir();

  // Build and pack package
  console.log("\nPackaging @coat/cli");
  await execa("npm", ["pack", packageRootDir], { cwd: tmpDir });
  const tarFileName = `coat-cli-${version}.tgz`;
  const tarPath = path.join(tmpDir, tarFileName);

  console.log("Installing @coat/cli in temporary directory");
  // Install package into temporary directory
  await execa("npm", ["install", tarPath], { cwd: tmpDir });

  // Set global environment variable which is used in integration tests
  // for the cli path
  process.env.COAT_CLI_TMP_INTEGRATION_PATH = tmpDir;
};
