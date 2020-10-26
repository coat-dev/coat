module.exports = {
  name: "multiple-npm-dependencies-template",
  dependencies: {
    devDependencies: {
      "node-noop": "1.0.0",
    },
    dependencies: {
      noop: "^0.2.0",
    },
  },
};
