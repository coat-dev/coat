# coat example - multiple-npm-scripts

An example for a coat project using a local coat template that merges multiple build scripts into an npm script that are executed in parallel.

## Playing with the example

Ensure that `coat` is [installed correctly](TODO) before trying out the example.

* Run `coat run build` or `npm run build` in this example folder. You will see that the merged scripts are executed in parallel.
* Adjust the scripts in the template, e.g. by adding another one or renaming the `scriptName` property of one of the build scripts. You can then see how the resulting `package.json` scripts object is updated after running `coat sync` again.
* Delete `package.json.json` and run `coat sync`. The file will be re-generated and placed again with all required scripts.

## Explanation

* The coat project specified in `coat.json` extends a single coat template exported in `coat-template.js`.
* TODO
