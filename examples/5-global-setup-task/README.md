# coat example - setup-task

An example for a coat project using a local coat template that specifies and runs a single [global task](TODO: Link to task descriptions). Global tasks are run only once for a project - in this example the tasks fakes the creation of a GitHub repository for the project.

## Playing with the example

Ensure that `coat` is [installed correctly](TODO) before trying out the example.

* Run `coat sync` and the fake setup task is run automatically.
* Run `coat sync` again after running it once to see that the task will not be run again.
* Delete the `coat.lock` file after running `coat sync` once to make `coat sync` run the setup task again.
* Modify the `run` function inside the template to adjust the tasks behavior.

## Explanation

* The coat project specified in `coat.json` extends a single coat template exported in `coat-template.js`.
* The coat template in `coat-template.js` specifies a global task that fakes the creation of a GitHub repository
* TODO: Prompt yes & no explanation | coat.lock explanation
