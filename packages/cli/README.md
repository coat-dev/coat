
<p align="center">
  <img alt="coat" src="https://i.imgur.com/FscVxuq.png" width="546">
</p>

<p align="center">
  Declarative & continuous project configuration
</p>

<p align="center">
  <a href="https://codecov.io/gh/coat-dev/coat">
    <img src="https://codecov.io/gh/coat-dev/coat/branch/main/graph/badge.svg">
  </a>
  <a href="https://github.com/coat-dev/coat/actions">
    <img src="https://github.com/coat-dev/coat/workflows/@coat/cli/badge.svg?branch=main&event=push">
  </a>
  <a href="CODE_OF_CONDUCT.md">
    <img src="https://img.shields.io/badge/Contributor%20Covenant-v2.0%20adopted-ff69b4.svg">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/npm/l/@coat/cli">
  </a>
</p>

<!-- TODO: Smaller logo + animated gif of changing configuration file + customization -->

## TODOs:

* [ ] Intro logo area
* [x] Intro text
* [x] Usage
* [x] Templates
* [ ] Motivation
* [ ] Documentation
* [ ] Roadmap
* [X] Contributing
* [X] License

`coat` aims to make maintaining projects more fun than starting new ones.

* **Continuously managed configuration**: Instead of generating one-time configuration files for a project when it is created, `coat sync` keeps your configuration files up to date and updates them to the latest version.
* **Full customization:** All files that are managed by coat are fully customizable by creating a [customization file](add link to customization section) next to them. This enables you to keep your project configuration up-to-date while customizing the file outputs exactly to your project's needs.
* **Setup your team for success:** `coat` projects and templates can run setup tasks that are run once for a project (e.g. setting up secrets on your CI system) or once per developer (e.g. setting up a local database that the project depends on) to ensure that your and your team's development environment is always in sync.

>**Note**: `coat` is still in experimental stage and while it is already used in production at [ORDA](https://www.orda-app.com), there might be breaking changes before reaching 1.0.0.

## 🙏 I need your feedback!

I'd love to hear your feedback about `coat`. If you encounter any issues, created a template and want to add it to this README or want to submit a feature request please open a GitHub issue or tweet to me at [@peterjuras](https://twitter.com/peterjuras) 🐦

## Table of content

- Update at the end! or search for extension that does it
- [Templates](#templates)
- [Installation | Usage | Getting started](#installation---usage---getting-started)
- [Motivation](#motivation)
- [Documentation](#documentation)
- [How to contribute / Contributing](#how-to-contribute---contributing)
- [Roadmap](#roadmap)
- [License](#license)

## 🚀 Usage

`coat` can be installed from [npm](https://www.npmjs.com/package/@coat/cli) and works on Linux, macOS and Windows:

```bash
npm install -g @coat/cli
```

You can also run and create coat projects without installing, e.g. a template for a [TypeScript package](packages/template-ts-package/README.md):

```bash
npx @coat/cli create @coat/template-ts-package

# OR

npm install -g @coat/cli
coat create @coat/template-ts-package
```

After you have installed a coat template in your project you can keep your files up-to-date by calling `coat sync`.

### Automatically managed configuration

To see how coat manages your configuration automatically, try switching from compiling files via TypeScript to using babel:

1. `npm install -g @coat/cli`
2. `coat create @coat/template-ts-package my-project`
3. `cd my-project`
4. Modify `coat.json` to use babel instead of TypeScript for transpiling source files:
```json
{
  "name": "my-project",
  "extends": [
    [
      "@coat/template-ts-package",
      {
        "compiler": "babel"
      }
    ]
  ]
}
```
5. Run `coat sync` and observe how the project files have been updated.

For more usage information, including [customization](TODO) and [examples](TODO) please check out the [documentation section](TODO) below.

## 📋 coat templates

`coat` projects can extend one or multiple templates that specify which files should be placed and which setup tasks need to run.

Since this early public release of `coat` is aimed to gather feedback, there is currently only one official template - a template to create and maintain a [TypeScript package](packages/template-ts-package/README.md).

You can however create your own coat templates and even reference local JavaScript files that export a coat template in your `coat.json` manifest file. Check out the [template-ts-package](packages/template-ts-package/README.md) template to get an idea of how a coat template is structured.

It is planned to support more languages and frameworks with official `coat` templates. Please check the [roadmap](TODO) below for more information.

## 🌟 Motivation

* Configuration left behind after starting projects
* Configuration files touched rarely, leading to effort when an upgrade is needed
* Rare touching makes it harder for tooling authors to innovate and create breaking changes (Webpack blog post reference)

## 📚 Documentation

TODO: Higher level links to individual markdown files for sections.

* How coat works
  * Image with templates, coat manifest & customization file
* Examples X
  * Single file with customization export
  * Single file with customization function
  * Multiple file types
  * File merged from multiple templates (two templates + coat manifest specifies something directly)
  * Setup task
  * Local files + local setup task
  * Multiple scripts
  * Dependencies (Two classes dev + normal)
* Customization X
  * Customization for each file type
    * JSON
    * TEXT
    * YAML
  * Explanation: Why not in-place?
* CLI commands X
  * sync
  * create
  * run
  * setup
* coat manifest reference
* Creating a template
* API Reference
  * Template types
* FAQ
  * Another generator?
  * JS only? (-> No)

## 🛣 Roadmap

* Categorize roadmap like VSCode

* Additional templates
* Fostering template creation
  * Utils for creating templates
  * Templating in templates
*	Support yarn as package manager
* Allow comments in outputted files
* Allow comments in coat manifest
* Allow multiple file types for coat manifest (jsonc, js, ts)
* New file type: JavaScript config files
* Allow multiple file types for customization (ts, json, custom directly for text)
* Hashless file updates (mechanism that is used for package.json, allowing in-place editing for files edited by tools)

* Issue only
  * Write file type when updating / creating files
  * Allow default exports for customization files

## 👥 Contributing

When contributing to this repository, please first discuss the change you wish to make via an issue before opening a pull request. Please read the [code of conduct](CODE_OF_CONDUCT.md) before contributing.

Until `coat` reaches 1.0.0 not all changes that are planned are tracked via issues, therefore the best way to contribute until then is to create coat templates or file issues with bugs or feedback. A more detailed guide on how to contribute to `coat` is in the works.

### How to build `coat`

After cloning the repository, run the following commands at the root of the repository to set up and build and the code:

* `npm install`
* `npx lerna bootstrap`

You will find the build outputs in each package's build folder.

## 🖋️ License

coat is [MIT licensed.](./LICENSE)
