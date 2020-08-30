module.exports = {
  name: "local-files-7",
  files: [
    {
      file: "a.json",
      type: "JSON",
      once: true,
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
  ],
};
