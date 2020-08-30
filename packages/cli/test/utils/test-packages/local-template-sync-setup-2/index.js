// eslint-disable-next-line @typescript-eslint/no-var-requires
const { promises: fs } = require("fs");

module.exports = {
  name: "local-template-sync-setup-2",
  setup: [
    {
      id: "global-task-1",
      run: async function writeFile() {
        await fs.writeFile("setup-test.txt", "");
        return { placedFile: true };
      },
      shouldRun: async function () {
        return true;
      },
    },
  ],
};
