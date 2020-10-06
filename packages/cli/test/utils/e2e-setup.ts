import path from "path";
import execa from "execa";
import tmp from "tmp";
import { version } from "../../package.json";

interface E2ETestDirResult {
  tarballPath: string;
  tmpDirPath: string;
}

export async function buildE2ETestDir(): Promise<E2ETestDirResult> {
  const packageRootDir = path.join(__dirname, "..", "..");
  const tmpDir = tmp.dirSync({ unsafeCleanup: true }).name;

  // Build and pack package
  console.log("\nPackaging @coat/cli");
  await execa("npm", ["pack", packageRootDir], { cwd: tmpDir });
  const tarFileName = `coat-cli-${version}.tgz`;
  const tarPath = path.join(tmpDir, tarFileName);

  console.log("Installing @coat/cli in temporary directory");
  // Install package into temporary directory
  await execa("npm", ["install", tarPath], { cwd: tmpDir });

  return {
    tarballPath: tarPath,
    tmpDirPath: tmpDir,
  };
}

// Packs and installs the cli in
// a temporary directory in order to run
// the e2e tests in an environment
// which mirrors a coat users actual development
// environment
export default async (): Promise<void> => {
  let tarballPath: string;
  let tmpDirPath: string;

  if (
    process.env.COAT_CLI_E2E_SESSION_TARBALL_PATH &&
    process.env.COAT_CLI_E2E_SESSION_TMP_PATH
  ) {
    tarballPath = process.env.COAT_CLI_E2E_SESSION_TARBALL_PATH;
    tmpDirPath = process.env.COAT_CLI_E2E_SESSION_TMP_PATH;
  } else {
    const result = await buildE2ETestDir();
    tarballPath = result.tarballPath;
    tmpDirPath = result.tmpDirPath;
  }

  // Set global environment variables which are used in
  // e2e tests for the cli and tarball path
  process.env.COAT_CLI_TMP_TARBALL_PATH = tarballPath;
  process.env.COAT_CLI_TMP_E2E_PATH = tmpDirPath;
};
