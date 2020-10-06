module.exports = ({ config }) => {
  const files = [
    {
      file: `${config.filePrefix}-a.json`,
      type: "JSON",
      content: { value: config.content },
    },
    {
      file: "static.json",
      type: "JSON",
      content: { value: config.content },
    },
  ];

  return {
    name: "local-template-with-config-1",
    files,
  };
};
