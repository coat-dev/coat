module.exports = {
  name: "local-files-1",
  files: [
    {
      file: "a.json",
      type: "JSON",
      content: {
        firstProperty: {
          a: true,
        },
        secondProperty: 123,
      },
    },
    {
      file: "b.txt",
      type: "TEXT",
      content: "Text from local-files-1",
    },
  ],
};
