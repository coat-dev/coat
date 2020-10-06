module.exports = {
  name: "local-template-update-flow",
  files: [
    {
      file: "global-once.json",
      type: "JSON",
      once: true,
      content: {
        global: "once",
        version: 2,
      },
    },
    {
      file: "global.json",
      type: "JSON",
      content: {
        global: "continuous",
        version: 2,
      },
    },
    {
      file: "local-once.json",
      type: "JSON",
      once: true,
      local: true,
      content: {
        local: "once",
        version: 2,
      },
    },
    {
      file: "local.json",
      local: true,
      type: "JSON",
      content: {
        local: "continuous",
        version: 2,
      },
    },
  ],
};
