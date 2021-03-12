import chalk from "chalk";
import execa from "execa";

/**
 * Returns a listener function that prefixes
 * all lines with a certain label and writes
 * the result to the passed stream.
 *
 * The stream should not be asynchrounous, and this
 * function is currently only able to handle process.stdout
 * and process.stdin safely.
 *
 * The implementation of this function is leaned heavily
 * on concurrently's prefixing mechanism.
 * See: https://github.com/kimmobrunfeldt/concurrently/blob/master/src/logger.js#L85
 *
 * @param stream The write stream, typically process.stdout or process.stderr
 * @param prefix The label that will be prepended to each line
 */
function createStreamPrefixHandler(
  stream: NodeJS.WriteStream,
  prefix: string
): (data: Buffer) => void {
  // The first line of a data chunk should
  // only be prefixed, if the last character
  // of the previous chunk ended with a new line.
  //
  // To prefix the first chunk correctly, lastChar
  // is initially set to a new line
  let lastChar = "\n";

  return (data: Buffer) => {
    // replace some ANSI code that would impact clearing lines
    // See concurrently issue #70:
    // https://github.com/kimmobrunfeldt/concurrently/pull/70
    const text = data.toString().replace(/\u2026/g, "...");

    const lines = text
      // Split the current chunk by new lines to
      // modify each line individually
      .split("\n")
      .map((line, index, array) => {
        if (
          // Prefix all lines except the first and the
          // last line - which is an empty line for
          // each chunk
          (index > 0 && index < array.length - 1) ||
          // The first line should only be prefixed
          // if the last character of the previous chunk
          // was a new line
          (index === 0 && lastChar === "\n")
        ) {
          // Color the prefix label using chalk
          return chalk`{dim ${prefix} - }${line}`;
        }

        // If no prefix is added, the line is returned
        // unmodified
        return line;
      });

    // Set the saved lastChar value to the last
    // character of the current text chunk to determine
    // whether the next chunk's first line needs to be prefixed
    lastChar = text[text.length - 1];

    // Write all lines to the stream.
    //
    // Although stream.write is an asynchrounous method,
    // using it with process.stdout and process.stderr is
    // synchrounous and does not need to be awaited.
    stream.write(lines.join("\n"));
  };
}

export async function runMultipleScripts(
  cwd: string,
  scripts: string[],
  args?: string[]
): Promise<void> {
  // Promise.all is used here to create a
  // fail fast behavior that exits once the first
  // script run fails
  await Promise.all(
    scripts.map(async (script) => {
      // Run scripts in silent mode to surpress
      // any npm specific output
      const npmArgs = ["run", "--silent", script];

      if (args?.length) {
        // Add two dashes ("--") in order for npm run
        // to pick up the arguments
        npmArgs.push("--", ...args);
      }

      const task = execa("npm", npmArgs, {
        cwd,
        // Setting FORCE_COLOR to true
        // helps to preserve colored
        // output in a lot of scenarios,
        // even though stdio are piped
        // for these tasks
        env: { FORCE_COLOR: "true" },
      });

      // Attach stream handlers that prefix
      // the outputs to stdout and stderr with
      // the script's name
      task.stdout?.on(
        "data",
        createStreamPrefixHandler(process.stdout, script)
      );
      task.stderr?.on(
        "data",
        createStreamPrefixHandler(process.stderr, script)
      );

      await task;
    })
  );
}
