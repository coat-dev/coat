module.exports = {
  name: "local-files-8",
  files: [
    {
      file: "a.json",
      type: "JSON",
      once: true,
      local: true,
      content: {
        b: true,
      },
    },
    {
      file: "b.json",
      once: true,
      local: true,
      type: "JSON",
      content: {
        local2: true,
      },
    },
    {
      file: "folder-1/c.json",
      local: true,
      type: "JSON",
      content: {
        c: true,
      },
    },
  ],
};
