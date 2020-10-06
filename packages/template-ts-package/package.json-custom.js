module.exports = (packageJson) => {
  const newPackageJson = {
    ...packageJson,
    scripts: {
      ...packageJson.scripts,
    },
    files: ["build/", "files/"],
  };

  newPackageJson.scripts.prepare = "coat run build && coat sync";

  return newPackageJson;
};
