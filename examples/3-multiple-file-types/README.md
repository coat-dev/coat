# coat example - multiple-file-types

An example for a coat project using a local coat template that generates multiple continuously generated files:

* `config.json` - A JSON file
* `config.yaml` - A YAML file
* `example.txt` - A TEXT file

## Playing with the example

Ensure that `coat` is [installed correctly](TODO) before trying out the example.

* Adjust the contents of one of the customization files, e.g. `config.json-custom.js` and run `coat sync`. Your customizations will be merged into the resulting file.
* Adjust the content of one of the file entries in `coat-template.js` and run `coat sync`. The resulting files will be updated.
* Delete one of the generated files and run `coat sync`. The file will be re-generated and placed again.

## Explanation

* The coat project specified in `coat.json` extends a single coat template exported in `coat-template.js`.
* The coat template in `coat-template.js` specifies three continuously managed files.
* Running coat sync will gather all files from all templates and place them relative to the project inside this example folder.
* Before placing the files, `coat` checks for customization files. Customization files are named `<filename>-custom.js` and `coat` finds customization files for all three generated files and merges their exports into the resulting files.
* Both JSON and YAML files expect a JSON object as exports for customization files. TEXT files such as `example.txt` expect a string as the export of customization files.
