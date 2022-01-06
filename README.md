# Garment

Garment is a toolkit for building applications using modern tools and scalable development practices. It encourages the monorepo way of building applications and provides a consistent developer experience across projects.

Garment toolchain enables you to:

- Use modern tooling in a consistent way across your organization
- Have a similar developer experience across any project
- Share code easily between multiple applications
- Automate common tasks
- Have fast builds and tests in projects of any size

## Why Garment ?

### Scalability

As an application codebase grows in size and number of contributors it's a good practice to split it into smaller composable and independent modules, but common tasks like build and test, tend to become really slow in these codebases. In order to keep the speed at the optimal level, Garment employs various technics such as dependency graph analysis, parallel execution, incremental builds, and caching of successful runs.

### Autonomy

Garment allows to defining tasks, configurations, and tooling per project ensuring that projects and teams remain autonomous while working in the same repository

### Developer Experience

Garment provides a common way of adding new tools to your projects, it enables teams to build on top of each other while providing a fast and reliable developer experience for projects of any size. It also provides a common way of automating common tasks such as creating boilerplates and generators

### Extensibility

You can easily support many different tools and workflows to fit your project needs with Garment Runners.

## Getting Started

To start using Garment we first need to install it

    yarn add @garment/cli

_We recommend the usage of yarn with due to its native workspaces support and deterministic lockfile_

After Garment is installed we can initialize it in a current folder by running

    yarn garment init

It will create `garment.json` file with a following structure

```json
{
  "presets": {},
  "projects": {},
  "schematics": []
}
```

From now on we can populate our workspace with projects.

> If you want to start using Garment in existing Lerna or Yarn Workspaces project, you can use `yarn garment init --from (lerna | yarn | folder)`

### To learn about all available commands, please check the docs for [CLI](/docs/CLI.md)

Let's say we have a monorepo with two JavaScript packages

    monorepo/
    node_modules/
    packages/
      package-a/
        src/
          index.js
        package.json
      package-b/
        src/
          index.js
        package.json
    yarn.lock
    package.json

Here's how our `garment.json` would look like after we add our packages.

```json
{
  "presets": {},
  "projects": {
    "package-a": {
      "path": "packages/package-a"
    },
    "package-b": {
      "path": "packages/package-b"
    }
  },
  "schematics": []
}
```

## Defining Tasks

Now that the basic setup for your project is done, you'll want to add some tasks to perform work on your codebase

```json
{
  "presets": {},
  "projects": {
    "package-a": {
      "path": "packages/package-a",
      "tasks": {
        "build": {
          "runner": "babel",
          "input": "{{projectDir}}/src/**/*.js",
          "output": "{{projectDir}}/dist"
        }
      }
    },
    "package-b": {
      "path": "packages/package-b",
      "tasks": {
        "build": {
          "runner": "babel",
          "input": "{{projectDir}}/src/**/*.js",
          "output": "{{projectDir}}/dist"
        }
      }
    }
  },
  "schematics": []
}
```

You'll notice that each task has a mandatory runner key, runners are the abstraction garment uses to integrate external tools into your workflow.

While tasks allow you to define an id and a set of options to perform some task, Runners will be the ones who perform the actual work.

Notice that you don't need to specify the full path for a task input/output, `{{projectDir}}` get's aliased to your project path at runtime

[Configuration](/docs/Configuration.md)

## Runners

You can think of Runners as a plugin that abstracts away tooling configuration and can be reused across tasks and projects.

Modern applications run many tools on top of your code for tasks such as build, test, lint, and bundle.

Runners provide a common configuration and interface for those tools, and Garment integrates them into a single workflow.

This makes it easy to integrate and incrementally adopt new tools in your projects

[Creating a Runner](/docs/creating_runner.md)

## Presets

For projects with common workflows, you can create a preset. A preset is a common configuration of a runner which can be reused by multiple projects

```json
{
  "presets": {
    "babel-package": {
      "tasks": {
        "build": {
          "runner": "babel",
          "input": "{{projectDir}}/src/**/*.js",
          "output": "{{projectDir}}/dist"
        }
      }
    }
  },
  "projects": {
    "package-a": {
      "path": "packages/package-a",
      "extends": ["babel-package"]
    },
    "package-b": {
      "path": "packages/package-b",
      "extends": ["babel-package"]
    }
  },
  "schematics": []
}
```

## Schematics

Schematics are code generators that can be used to automate common tasks like creating new packages or components or even integrating a new Runner into an existing project. Schematics are also a great way of automating conventions and rules, making projects consistent in an automated way.

### Why schematics

> Manipulating the code in an application has the potential to be both very powerful and correspondingly dangerous. For example, creating a file that already exists would be an error, and if it was applied immediately, it would discard all the other changes applied so far. The Angular Schematics tooling guards against side effects and errors by creating a virtual file system. A schematic describes a pipeline of transformations that can be applied to the virtual file system. When a schematic runs, the transformations are recorded in memory, and only applied in the real file system once they're confirmed to be valid.

You can use schematics in your project just by telling garment which schematics package to look for in the `garment.json` file

```json
{
  "schematics": ["@garment/standard-schematics"]
}
```

Then you can run the `generate` command to have access to all the schematics in the package provided

    yarn garment generate

[Creating schematics](/docs/creating_schematics.md)

## Contributing

Read the [Contributing guidelines](CONTRIBUTING.md)

### Disclaimer

By sending us your contributions, you are agreeing that your contribution is made subject to the terms of our [Contributor Ownership Statement](https://github.com/Farfetch/.github/blob/master/COS.md)

## Maintainers

List of [Maintainers](MAINTAINERS.md)

## License

[MIT](LICENSE.md)
