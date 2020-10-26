# coat example - multiple-npm-dependencies

An example for a coat project using a local coat template that merges multiple npm dependencies into the resulting package.json.

## Playing with the example

Ensure that `coat` is [installed correctly](TODO) before trying out the example.

* Adjust the dependencies in the template, e.g. TODO add another dependency or devDependency or modify one of the versions.
* Delete `package.json.json` and run `coat sync`. The file will be re-generated and placed again with all specified dependencies.

## Explanation

* The coat project specified in `coat.json` extends a single coat template exported in `coat-template.js`.
* The coat template specifies a dependency on `noop` and a devDependency on `node-noop`. These dependencies have been chosen due to their small file size for this example.
* `coat sync` will only override the dependency entries in package.json, if package.json does not satisfy the range of the dependency that is specified in the coat template. For example, the coat template specifies noop's range as `^0.2.0`. Since the version specified in package.json - `0.2.2` - falls within the range, the version in package.json remains untouched and stays at `0.2.2`.
* TODO: Open issue for bug when template dependency is fixed and package.json dependency is non fixed: Could leave to wrong locked dependency (e.g. ^ vs fixed)
