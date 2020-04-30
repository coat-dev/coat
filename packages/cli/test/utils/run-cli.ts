import path from "path";
import execa from "execa";
import { getTmpDir } from "./get-tmp-dir";

interface RunCliResult {
  task: execa.ExecaChildProcess<string>;
  cwd: string;
}

export function runCli(args: string[], cwd?: string): RunCliResult {
  if (!process.env.COAT_CLI_TMP_INTEGRATION_PATH) {
    throw new Error(
      "Environment variable COAT_CLI_TMP_INTEGRATION_PATH must be defined for integration tests. Ensure that jest is running the global setup file."
    );
  }

  const binPath = path.join(
    process.env.COAT_CLI_TMP_INTEGRATION_PATH,
    "node_modules",
    "@coat",
    "cli",
    "build",
    "bin",
    "cli.js"
  );
  let usableCwd: string;

  if (cwd) {
    usableCwd = cwd;
  } else {
    usableCwd = getTmpDir();
  }
  const task = execa("node", [binPath, ...args], {
    cwd: usableCwd,
  });
  return {
    task,
    cwd: usableCwd,
  };
}
