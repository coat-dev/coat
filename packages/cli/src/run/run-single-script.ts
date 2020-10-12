import execa from "execa";

/**
 * Runs a single npm script from a package.json file
 * with the provided arguments
 *
 * @param cwd The working directory where the script should be run from
 * @param script The name of npm script
 * @param args Optional arguments that will be passed to the script
 */
export async function runSingleScript(
  cwd: string,
  script: string,
  args?: string[]
): Promise<void> {
  // Run scripts in silent mode to suppress
  // any npm specific output
  const npmArgs = ["run", "--silent", script];

  if (args?.length) {
    // Add two dashes ("--") in order for npm run
    // to pick up the arguments
    npmArgs.push("--", ...args);
  }

  await execa("npm", npmArgs, {
    // Inherit the stdio to enable interactive
    // use cases like jest's watch mode
    stdio: "inherit",
    cwd,
  });
}
