module.exports = {
  name: "local-files-3",
  files: [
    {
      file: "a.json",
      type: "JSON",
      content: {
        firstProperty: {
          c: true,
        },
        secondProperty: 987,
      },
    },
    {
      file: "b.txt",
      type: "TEXT",
      content: "Text from local-files-3",
    },
    {
      file: "c.txt",
      type: "TEXT",
      content: "Text from local-files-3",
    },
  ],
};
