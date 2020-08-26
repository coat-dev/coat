module.exports = {
  name: "local-template-3",
  files: [
    {
      file: "package.json",
      type: "JSON",
      content: (oldContent) => ({
        ...oldContent,
        dependencies: {
          "local-dependency-after":
            oldContent.dependencies["local-dependency-before"],
        },
      }),
    },
  ],
};
