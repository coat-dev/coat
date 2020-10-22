module.exports = {
  name: "multiple-file-types-template",
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
    {
      file: "config.yaml",
      type: "YAML",
      content: {
        a: 1,
        b: 2,
        c: 3,
        d: [4, 5],
      },
    },
    {
      file: "example.txt",
      type: "TEXT",
      content: "Example text\nwith a second line.",
    },
  ],
};
