
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
  <a href="https://github.com/coat-dev/coat/actions">
    <img src="https://img.shields.io/npm/l/@coat/cli">
  </a>
</p>

<!-- TODO: Smaller logo + animated gif of changing configuration file -->

`coat` aims to make maintaining projects more fun than starting new ones.

* **Continuously managed configuration**: Instead of generating one-time configuration files for a project when it is created, `coat sync` keeps your configuration files up to date and updates them to the latest version.
* **Full customization:** All files that are managed by coat are fully customizable by creating a [customization file](add link to customization section) next to them. This enables you to keep your project configuration up-to-date while customizing the file outputs exactly to your project's needs.
* **Setup your team for success:** `coat` projects and templates can run setup tasks that are run once for a project (e.g. setting up secrets on your CI system) or once per developer (e.g. setting up a local database that the project depends on) to ensure that your and your team's development environment is always in sync.

>**Note**: `coat` is still in experimental stage and while it is already used in production at [ORDA](https://www.orda-app.com), there might be breaking changes before reaching 1.0.0.

## 🙏 I want your feedback!

I'd love to hear your feedback about `coat`. If you encounter any issues, created a template and want to add it to this README or want to submit a feature request please open a GitHub issue or tweet to me at [@peterjuras](https://twitter.com/peterjuras) 🐦

## Table of content

- Update at the end! or search for extension that does it
- [I want your feedback!](#i-want-your-feedback-)
- [TOC](#toc)
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

For more usage information, including [customization](TODO) please check out the [documentation section](TODO) below.

## 📋 coat templates

`coat` projects can extend one or multiple templates that specify which files should be placed and which setup tasks need to run.

Adjust text here a bit it's weird
Since this first public release of `coat` is very early to gather feedback, there is currently only one official template - a template to create and maintain a [TypeScript package](packages/template-ts-package/README.md).

You can however create your own coat templates and even reference local JavaScript files in your `coat.json` manifest file. Check out the [template-ts-package](packages/template-ts-package/README.md) template to view how a coat template is structured.

It is planned to support more languages and frameworks with official `coat` templates. Please check the [roadmap](TODO) below for more information.

## Documentation
* How coat works
## Motivation
## Roadmap
## How to contribute / Contributing
## License
