// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require("fs");

module.exports = {
  name: "local-template-setup-3",
  setup: [
    {
      id: "globalTask1",
      run: async () => {
        // Place a file in the current working directory
        // to test whether the task is run
        await fs.promises.writeFile("globalTask1.txt", "test");

        return {
          globalFirstResult: true,
        };
      },
      // Task should always run
      shouldRun: () => true,
    },
  ],
};
