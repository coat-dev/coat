module.exports = {
  name: "local-template-setup-2",
  setup: [
    {
      id: "globalTask1",
      run: () => {
        return {
          firstResult: true,
        };
      },
    },
    {
      id: "localTask1",
      local: true,
      run: () => {
        return {
          localFirstResult: true,
        };
      },
    },
    {
      id: "localTask2",
      local: true,
      run: () => {
        throw new Error("Expected Error");
      },
    },
    {
      id: "globalTask2",
      run: () => {
        return {
          secondResult: true,
        };
      },
    },
  ],
};
