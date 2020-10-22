module.exports = (oldConfig, defaultMergeFunction) => {
  const newConfig = defaultMergeFunction(oldConfig, {
    b: "custom",
    e: 6,
  });

  return {
    ...newConfig,
    d: [...oldConfig.d, 40, 50],
  };
};
