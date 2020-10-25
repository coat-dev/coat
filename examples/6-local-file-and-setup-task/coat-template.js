const readline = require("readline");

/**
 * Prompts the user and returns the answer in a Promise
 *
 * @param {string} question The prompt that will be displayed to the user
 * @returns {Promise<string>} The answer to the prompt
 */
async function prompt(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(`${question} `, (answer) => {
      resolve(answer);
      rl.close();
    });
  });
}

const envVarToolType = {
  autoenv: 1,
  direnv: 2,
};

/**
 * Setup run function to determine which environment variable management
 * tool should be used in this (fake) coat project
 *
 * @returns {Promise<void>}
 */
async function envVarToolSetup() {
  // Ask the user whether direnv or autoenv should be used
  // to manage environment variables
  console.log(
    "[FAKE] This project requires some environment variables to work correctly."
  );
  console.log(
    "[FAKE] Would you like to use autoenv (1) or direnv (2) to manage environment variables for this repository?\n"
  );

  const answerRaw = await prompt("Please enter your choice:");
  const answerSanitized = answerRaw.trim().toLocaleLowerCase();
  let envVarTool;

  switch (answerSanitized) {
    case "autoenv":
    case "1":
      envVarTool = envVarToolType.autoenv;
      break;
    case "direnv":
    case "2":
      envVarTool = envVarToolType.direnv;
      break;
    default:
      throw new Error('Please enter "autoenv", "1", "direnv" or "2"');
  }

  // Return the tool type as the task result
  return {
    type: envVarTool,
  };
}

/**
 * Exports a function which resolves to a coat template.
 * Coat template functions are called with the coat context, which holds
 * the results for previously executed setup tasks.
 */
module.exports = ({ coatContext }) => {
  const files = [];

  // Check whether the setup task has already been run
  // to detect whether we should place an .env file or a .envrc file
  const envVarToolSetupTaskId = "environment-var-tool-selection";
  const setupTaskResult =
    coatContext.coatLocalLockfile.setup[envVarToolSetupTaskId];

  if (setupTaskResult) {
    switch (setupTaskResult.type) {
      case envVarToolType.autoenv:
        files.push({
          file: ".env",
          content: "autostash MY_ENV_VAR=1\nautostash SECOND_ENV_VAR=2",
          type: "TEXT",
          local: true,
        });
        break;
      case envVarToolType.direnv:
        files.push({
          file: ".envrc",
          content: "export MY_ENV_VAR=1\nexport SECOND_ENV_VAR=2",
          type: "TEXT",
          local: true,
        });
        break;
      default:
        throw new Error(
          "There appears to be an issue with the current coat project setup. Please delete .coat/coat.lock and run coat sync again."
        );
    }
  }

  // Add the local and potential customization files to .gitignore
  // to allow local customizations per repository clone
  // that are not tracked by git
  files.push({
    file: ".gitignore",
    content: (previousContent) =>
      [
        previousContent,
        ".env",
        ".env-custom.js",
        ".envrc",
        ".envrc-custom.js",
      ].join("\n"),
    type: "TEXT",
    once: true,
  });

  return {
    name: "local-file-and-setup-task-template",
    files,
    setup: [
      {
        id: envVarToolSetupTaskId,
        local: true,
        run: envVarToolSetup,
      },
    ],
  };
};
