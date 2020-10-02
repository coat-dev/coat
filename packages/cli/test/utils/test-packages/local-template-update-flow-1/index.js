module.exports = {
  name: "local-template-update-flow",
  files: [
    {
      file: "global-once.json",
      type: "JSON",
      once: true,
      content: {
        global: "once",
        version: 1,
      },
    },
    {
      file: "global.json",
      type: "JSON",
      content: {
        global: "continuous",
        version: 1,
      },
    },
    {
      file: "local-once.json",
      type: "JSON",
      once: true,
      local: true,
      content: {
        local: "once",
        version: 1,
      },
    },
    {
      file: "local.json",
      local: true,
      type: "JSON",
      content: {
        local: "continuous",
        version: 1,
      },
    },
    {
      file: "global-only-v1.json",
      type: "JSON",
      content: {
        global: "only-in-v1",
        version: 1,
      },
    },
  ],
};
