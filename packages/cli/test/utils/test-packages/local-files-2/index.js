module.exports = {
  name: "local-files-2",
  files: [
    {
      file: "a.json",
      type: "JSON",
      content: {
        firstProperty: {
          b: true,
        },
        secondProperty: 321,
      },
    },
    {
      file: "c.txt",
      type: "TEXT",
      content: "Text from local-files-2",
    },
  ],
};
