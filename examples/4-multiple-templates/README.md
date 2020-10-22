# coat example - multiple-templates

An example for a coat project using multiple local coat templates that generates a continuously managed file `config.json`.

## Playing with the example

Ensure that `coat` is [installed correctly](TODO) before trying out the example.

* Adjust the contents of the customization file `config.json-custom.js` and run `coat sync`. Your customizations will be merged into the resulting file.
* Adjust the content of one of the templates - e.g. `coat-template-1.js` and run `coat sync`. The resulting file will be updated.
* Remove one of the templates from `coat.json`'s extends entry and run `coat sync`. The resulting file will be updated.
* Delete `config.json` and run `coat sync`. The file will be re-generated and placed again.

## Explanation

* The coat project specified in `coat.json` extends two coat templates exported in `coat-template-1.js` and `coat-template-2.js`.
* Boat coat templates specify a continuously managed file `config.json`.
* Running coat sync will gather all files from all templates and place them relative to the project inside this example folder.
* The file `config.json` will be merged in the following order:
  * The first template that is gathered is `coat-template-1.js`, since it is the first entry in the `extends` array in `coat.json`. After this step, the content of `config.json` is `{ "a": 1 }`.
  * The second template that is gathered is `coat-template-2.js`, since it is the second entry in the `extends` array in `coat.json`. After this step, the content of `config.json` is `{ "a": 2, "b": 1 }`, since it is merged into the previous content and property `a` is overridden.
  * The coat manifest (`coat.json`) itself is also treated as a template and is applied after all `extends` entries. After this step, the content of `config.json` is `{ "a": 3, "b": 1, "c": 1 }`, since it is merged into the previous content, property `a` is overridden and `b` is kept.
  * Before placing the files, `coat` checks for customization files. Customization files are named `<filename>-custom.js` and `coat` finds the customization for `config.json` named `config.json-custom.js`. The resulting `config.json` after merging the customization export is `{ "a": 3, "b": 1, "c": 1, "d": [40, 50] }`.
