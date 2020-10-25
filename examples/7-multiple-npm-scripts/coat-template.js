module.exports = {
  name: "multiple-npm-scripts-template",
  scripts: [
    {
      id: "build-type-definitions",
      scriptName: "build",
      run:
        'echo "[FAKE] Generating type definitions, e.g. using flow or TypeScript ..."',
    },
    {
      id: "build-transpile-to-js",
      scriptName: "build",
      run: 'echo "[FAKE] Transpiling to JavaScript, e.g. using babel ..."',
    },
  ],
};
