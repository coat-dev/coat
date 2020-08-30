module.exports = {
  name: "local-template-setup-1",
  setup: [
    {
      id: "globalTask",
      run: ({ previousResults }) => {
        if (previousResults.global.globalTask) {
          return {
            globalCounter: previousResults.global.globalTask.globalCounter + 1,
          };
        }
        return {
          globalCounter: 1,
        };
      },
    },
    {
      id: "localTask",
      local: true,
      run: ({ previousResults }) => {
        if (previousResults.local.localTask) {
          return {
            localCounter: previousResults.local.localTask.localCounter + 1,
          };
        }
        return {
          localCounter: 1,
        };
      },
    },
  ],
};
