module.exports = {
  name: "local-create-template-1",
  files: [
    {
      file: "a.json",
      content: {
        a: true,
      },
      type: "JSON",
    },
    {
      file: "ignored.txt",
      content: "Ignored",
      type: "TEXT",
    },
    {
      file: ".gitignore",
      content: `
      node_modules
      /ignored.txt
      `,
      type: "TEXT",
    },
  ],
};
