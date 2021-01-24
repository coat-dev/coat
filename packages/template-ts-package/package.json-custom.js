module.exports = (packageJson) => {
  const newPackageJson = {
    ...packageJson,
    files: ["build/", "files/"],
  };

  return newPackageJson;
};
