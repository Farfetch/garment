# CLI

Garment CLI defines a set of commands which are divided in two categories: 

- Task execution commands
- Other commands

# Task Execution commands

Basic command for running given task

Usage: `garment <taskName> [project] [...options]`

Example: `garment build`

`project: string`

**Default**: empty

Names of the projects you want to run the task on. If empty, task will be executed for all projects in a workspace.

`files: string[]`

**Default**: empty

This flag allows to pass to Garment file paths instead of project names. Useful for running task on changed files together with `lint-staged`

`projects: string[]`

**Default**: empty

This flag allows to execute a task for a set of projects

`exclude: string[]`

**Default**: empty

Exclude given projects from the execution

`watch: boolean`

**Default**: `false`

Run Garment in a watch mode

`skipLifecycle: boolean`

**Default**: `false`

Prevent execution of lifecycle tasks like `pre<taskName>` and `post<taskName>`

`cache: boolean`

**Default**: `true`

Activate cache (--no-cache do deactivate)

### Passing runner's options through CLI

If the task is implemented using only one runner, any non-Garment flag will be passed to it as options. 

`garment test --testPathPattern Example -u`

Flags `testPathPattern` and `u` will be passed to the `jest-runner`

If you want to be more specific on which option should be passed to which runner, you the following format:

`garment build --{runnerName}.{flagName}`

`runnerName` is the name which was used in the `runner` field for task definition inside the `garment.json`. 

Examples:

- `garment build --babel.env legacy --babel.sourceMaps`

- `garment test --jest.testPathPattern button`

# Other commands

## `init` 

Initializes Garment workspace by creating `garment.json` file

Usage: `garment init --from (yarn|lerna)`

## `generate` 

Run generator

Alias: `g`

Usage: `garment generate <generator-name>`

Example: `garment g package`

## `action-graph` 

Shows project's action graph

Usage: `garment dep-graph <taskName> <projectName>`

## `dep-graph` 

Shows projects' dependency graph

Usage: `garment dep-graph`

## `projects` 

Shows a list of all projects

Usage: `garment projects`

## `tasks <project-name>` 

Shows a list of all tasks and their runners for a given project

Usage: `garment tasks my-app`

## `cache` 

Shows path to directory where the cache is stored

Usage: `garment cache`

To clean the cache use `garment cache clean`

## `tasks <project-name>` 

Shows a list of all tasks and their runners for a given project

Usage: `garment tasks`



