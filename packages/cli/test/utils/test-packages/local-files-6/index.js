module.exports = {
  name: "local-files-6",
  files: [
    {
      file: "a.json",
      once: true,
      type: "JSON",
      content: {
        a: true,
      },
    },
    {
      file: "b.json",
      once: true,
      local: true,
      type: "JSON",
      content: {
        local: true,
      },
    },
  ],
};
