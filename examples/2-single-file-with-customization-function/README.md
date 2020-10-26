# coat example - single-file-with-customization-function

An example for a coat project using a local coat template that generates a single continuously managed file named `config.json` with a customization file using a customization function.

## Playing with the example

Ensure that `coat` is [installed correctly](TODO) before trying out the example.

* Adjust the contents of the customization file `config.json-custom.js` and run `coat sync`. Your customizations will be merged into the resulting `config.json`.
* Adjust the content of the `config.json` file entry in `coat-template.js` and run `coat sync`. The resulting `config.json` will be updated.
* Delete `config.json` and run `coat sync`. The file will be re-generated and placed again.

## Explanation

* The coat project specified in `coat.json` extends a single coat template exported in `coat-template.js`.
* The coat template in `coat-template.js` specifies a continuously managed file `config.json`.
* Running coat sync will gather all files from all templates - in this case only the `config.json` file from the single `coat-template.js` - and place them relative to the project inside this example folder.
* Before placing the file, `coat` checks for customization files. Customization files are named `<filename>-custom.js` and `coat` finds the customization file `config.json-custom.js` which exports a function that returns a JSON object and merges its contents into the `config.json` content from the coat template before placing the result as `config.json`.
