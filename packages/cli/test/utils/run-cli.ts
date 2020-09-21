import path from "path";
import execa from "execa";
import { getTmpDir } from "./get-tmp-dir";

interface RunCliOptions {
  cwd?: string;
  env?: Record<string, string>;
}

export interface RunCliResult {
  task: execa.ExecaChildProcess<string>;
  cwd: string;
}

export function runCli(args: string[], options?: RunCliOptions): RunCliResult {
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
    "bin",
    "coat.js"
  );
  let usableCwd: string;

  if (options?.cwd) {
    usableCwd = options.cwd;
  } else {
    usableCwd = getTmpDir();
  }
  const task = execa("node", [binPath, ...args], {
    cwd: usableCwd,
    env: options?.env,
  });
  return {
    task,
    cwd: usableCwd,
  };
}
