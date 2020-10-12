import execa from "execa";

/**
 * Initializes a git repository and creates an initial
 * commit with all generated files.
 *
 * If git is unavailable, or the project is already a part of
 * a git repository, no git repository or commit will be created
 *
 * @param cwd The working directory of the newly created coat project
 */
export async function addInitialCommit(cwd: string): Promise<void> {
  // Check whether the project already is a part of a git
  // repository and whether git is available
  const gitResult = await execa("git", ["rev-parse", "--is-inside-work-tree"], {
    cwd,
    reject: false,
  });

  // 128 is the exit code if git rev-parse is run outside
  // a working tree. If any other error code is returned,
  // git is either unavailable or the project is inside
  // another git repository
  if (gitResult.exitCode !== 128) {
    return;
  }

  // Initialize a new git repository
  await execa("git", ["init"], { cwd });

  // Add all files that are not ignored
  await execa("git", ["add", "--all"], { cwd });

  // Add an initial commit with all generated files
  await execa("git", ["commit", "-m", "Initialize project using coat create"], {
    cwd,
  });
}
