# coat examples

These examples are meant to portray how coat templates and projects are structured and each of them highlights specific features of coat.

* [single-file-with-customization](./1-single-file-with-customization/README.md)

  An example for a coat project using a local coat template that generates a single continuously managed file named `config.json` with a customization file.

* [single-file-with-customization-function](./2-single-file-with-customization-function/README.md)

  An example for a coat project using a local coat template that generates a single continuously managed file named `config.json` with a customization file using a customization function.

* [multiple-file-types](./3-multiple-file-types/README.md)

  An example for a coat project using a local coat template that generates multiple continuously generated files.

* [multiple-templates](./4-multiple-templates/README.md)

  An example for a coat project using multiple local coat templates that generates a continuously managed file `config.json`.

* [global-setup-task](./5-global-setup-task/README.md)

  An example for a coat project using a local coat template that specifies and runs a single global task. Global tasks are run only once for a project - in this example the tasks fakes the creation of a GitHub repository for the project.

* [local-file-and-setup-task](./6-local-file-and-setup-task/README.md)

  An example for a coat project using a local coat template that specifies and runs a single local task and generates a local file.

* [multiple-npm-scripts](./7-multiple-npm-scripts/README.md)

  An example for a coat project using a local coat template that merges multiple build scripts into an npm script that are executed in parallel.

* [multiple-npm-dependencies](./8-multiple-npm-dependencies/README.md)

  An example for a coat project using a local coat template that merges multiple npm dependencies into the resulting package.json.

## Looking for something else?

Are the examples unclear or were you looking for an example of another use case? Please open a [new issue](https://github.com/coat-dev/coat/issues/new) or let me know on [Twitter](https://twitter.com/peterjuras)!
