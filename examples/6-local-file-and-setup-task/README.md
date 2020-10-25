# coat example - local-file-and-setup-task

An example for a coat project using a local coat template that specifies and runs a single [local task](TODO: Link to task descriptions) and a [local file](TODO: Link to local file explanation).

Local tasks are run once per clone of the project. In this example, we want to give collaborators of this coat project the choice of using [`autoenv`]() or [`direnv`]() for managing the environment variables.

Local files are meant to be customizable per user. While they can be checked in if that's desired, their respective customization files should not be checked in to git to allow collaborators to customize the files based on their needs. In this example, the `.autoenv.zsh` or `.envrc` file - depending on the chosen tool from the local task - will be a local file, to allow collaborators to individually customize their environment variables.

## Playing with the example

Ensure that `coat` is [installed correctly](TODO) before trying out the example.

* Run `coat sync` and the fake local setup task is run automatically. After choosing
* Run `coat sync` again after running it once to see that the task will not be run again.
* Delete the `coat.lock` file after running `coat sync` once to make `coat sync` run the setup task again.
* Modify the `run` function inside the template to adjust the tasks behavior.

## Explanation

* The coat project specified in `coat.json` extends a single coat template exported in `coat-template.js`.
* The coat template in `coat-template.js` specifies a global task that fakes the creation of a GitHub repository
* When running `coat sync`, `coat` checks if there are any tasks that have to be run. By default tasks are run if there is no previous task result stored in the lockfile, therefore the `github-repo-creation` task is run on sync.
* The run function fakes the creation of a GitHub repository and returns an object as a task result which includes the `repositoryUrl`. This property is available inside a template creation function as part of the coat context and is stored in the `coat.lock` file.
* After running `coat sync` once, additional runs of `coat sync` will no longer run the task, since the previous result exists in the lockfile.
