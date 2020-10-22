module.exports = {
  name: "single-file-with-customization-template",
  files: [
    {
      file: "config.json",
      type: "JSON",
      content: {
        a: 1,
        b: 2,
        c: 3,
        d: [4, 5],
      },
    },
  ],
};
