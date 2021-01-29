# Garment Configuration

# Table of Contents

1. [Basic Structure](#basic-structure)
2. [Project Definition](#projectdefinition)   
    2.1 [Example](#example)  
    2.2 [Options](#options)
3. [Task Definition](#taskdefinition)  
    3.1 [Example Plain Task](#example-plain-task)  
    3.2 [Example Tasks Sequence](#example-tasks-sequence)
    3.3 [Example Parallel Tasks](#example-parallel-tasks)
    3.4 [Example Referencing other Tasks](#example-referencing-other-tasks)
    3.5 [Options](#options)
    3.6 [Additional Information](#additional-information)
4. [Cache Definition](#cachedefinition)  
## Basic structure

```json
{
  "presets": {},
  "projects": {
    [ProjectName]: ProjectDefinition
  },
  "schematics": [],
  "cache": CacheDefinition
}
```

## ProjectDefinition

### Example

```json
{
    "projects": {
    "store-app": {
        "path": "packages/store-app",
        "extends": ["babel-package"],
        "tasks": {
            [TaskName]: TaskDefinition | string | (TaskDefinition | string)[]
        }
    }
}

```

### Options

`path: string`

**Required**

Path to project directory, relative to the current workspace

`extends: string | string[]`

One or more names of projects or presets to extend. Beware that task definitions don't merge. Tasks in the project which is extending a preset completely override the task definition of the preset if the name is the same. Example:

```json
{
    "presets": {
        "babel-package": {
            "tasks": {
                "build": {...}
            }
        }
    },
    "projects": {
        "store-app": {
            "path": "packages/store-app",
            "extends": ["babel-package"],
            "tasks": {
                "build": {...} // Overrides babel-package's build task
            }
        }
    },
}
```

`tasks: TaskDefinition | string | (TaskDefinition | string)[]`

Task can be defined as an object following `TaskDefinition` structure, or as a string which references task in other projects or presets. For example, `react-button:build` or `typescript-package:clean`. If we need to reference another task in the same project or preset, we can omit the part before `:`. We can also define task as an array. In that case we can even mix objects and strings in the same list. Example:

```json
{
    "presets": {
        "common": {
            "tasks": {
                "clean": {...},
                "build": {...}
            }
        }
    },
    "projects": {
        "app": {
            "tasks": {
                "clean": "common:clean",
                "build": [
                    ":clean",
                    {...},
                    "common:build"
                ]
            }
        }
    }
}
```

See [TaskDefinition](#taskdefinition)

## TaskDefinition

### Example Plain Task

```json
{
    "presets": {
        "babel-package": {
            "tasks": {
                "build": {
                    "runner": "babel",
                    "input": "{{projectDir}}/src",
                    "output": "{{projectDir}}/dist",
                    "skipWatch": false,
                    "options": {...}
                }
            }
        }
    },
}
```

### Example Tasks Sequence

In this case, we want transpile source files with TypeScript and then without outputting the result to the disk, pass it to the Babel runner, and only after, output the result to `lib` folder.

```json
{
    "presets": {
        "babel-package": {
            "tasks": {
                "build": {
                    "runner": "typescript",
                    "input": "{{projectDir}}/src/**/*.ts",
                    "options": {...},
                    "next": {
                        "runner": "babel",
                        "options": {...},
                        "output": "{{projectDir}}/lib",
                    }
                }
            }
        }
    },
}
```

### Example Parallel Tasks

All the fields in configuration which allow to pass `TaskDefinition` object, also allow to pass an array of `TaskDefinition`. In this case, tasks will be executed in parallel. But there are cases, when we want to run some tasks in parallel and run some other task after them. In this case we can use a following configuration:

```json
{
    "presets": {
        "babel-package": {
            "tasks": {
                "build": {
                    "parallel": [
                        {
                            "runner": "typescript",
                            "input": "{{projectDir}}/src/**/*.ts",
                            "options": {...},
                        },
                        {
                            "runner": "postcss",
                            "input": "{{projectDir}}/src/**/*.css",
                            "options": {...},
                        }
                    ],
                    "next": {
                        "runner": "babel",
                        "options": {...},
                        "output": "{{projectDir}}/lib",
                    }
                }
            }
        }
    },
}
```

### Example Referencing other Tasks

You've seen that we can reuse tasks from other projects or presets by defining them as a string in `presetName:taskName` format. But it this case we can't reuse the task in a sequence. For that, we can use `ref` field

```json
{
    "presets": {
        "babel-package": {
            "tasks": {
                "build": {
                    "ref": "typescript-package:build",
                    "next": {
                        "runner": "babel",
                        "options": {...},
                        "output": "{{projectDir}}/lib",
                    }
                }
            }
        }
    },
}
```

### Options

`ref: string`

**!** Allowed only with the `next` option

**Default:** `empty`

Reference to the task from another project or preset in the `presetName:taskName` format.

`parallel: TaskDefinition | string | (TaskDefinition | string)[]`

**!** Allowed only with the `next` option

**Default:** `empty`

One or more tasks to execute in parallel.

`next: TaskDefinition | string | (TaskDefinition | string)[]`

**Default:** `empty`

One or more tasks to execute after the current task. All the output generated by the current task will be streamed to the next tasks.

`runner: string`

**Required**

Name of the runner which will be used to execute a task.

Garment will look for a package with the following convention `@garment/plugin-runner-{name}`.
You can also use a short name like `babel` which will be resolved as `@garment/plugin-runner-babel`.

`input: InputConfig | string`

**Default:** `empty`

Defines which files are sent as an input to the runner. If defined as an object, uses the following structure:

```json
{
  "rootDir": "{{projectDir}}/src",
  "include": ["**/*.js"],
  "exclude": []
}
```

`rootDir: string` defines where the input files are. `include: string[]` and `exclude: string[]` define glob patterns to include to or exclude from files set. Note, that each runner can have a default `include` and `exclude` patterns, so the developer only needs to define a `rootDir`. If `input` is a `string` then it defines a `rootDir` and uses default values `[**/*]` for include and `[]` for exclude, or the ones defined by runner.  Note that `rootDir` must exist and that when using globs, the non-magical part (the part before the first glob character) must exist.

If not specified, the files from previous tasks will be passed as input files. If you want to receive both files from the disk and previous tasks, you should specify `pipe` option as `true` or glob pattern;

`output: string | string[]`

**Default:** `empty`

Defines one or more output directories for a runner.

`pipe: string | true`

**Default:** `empty`

Defines if a runner should receive files from previous tasks. If `input` is not specified `pipe` is `true` by default. If `pipe` is a glob pattern, only matching files will be passed as a runner input.

`options: Object`

Runner options. See runner documentation

`buildDependencies: boolean | string | { task: string, watch?: boolean}`

**Default:** `true`

If set to `true`, before executing this task, Garment will run `build` task for every direct dependency of the project.
It can also be specified as a string, in this case serving as the name of the task you want to run on dependencies.
Or it can be an object, where besides specifying a task name, you can also specify whether this task should be run in watch mode or not.

`skipWatch: boolean`

**Default:** `false`

If set to `true`, when Garment is run with a `--watch` flag, the task will be executed at the first run, but then Garment won't watch for changes of that task input. For example, before build, we would run a clean task, but then we wouldn't want to clean files when they change.

### Additional Information

Each task can also have corresponding lifecycle tasks defined as `pre{taskName}` and `post{taskName}`. They are executed strictly before and after each task, meaning that their execution graph is separated.

Another technic that can be used to separate execution graphs is to combine task definitions in nested arrays.

## CacheDefinition

Cache options can be in two forms:

`{ type: 'file'; cacheDir?: path }`

By default cache is stored in `node_modules/@garment/.cache` folder

or

`{ type: 'custom'; provider: path }`

Where provider can be specified in a form of path to .js file, e.g. `./RedisCacheProvider.js`.

Cache provider should implement a following interface:

```js
module.exports = {
    async has(hash) {
        // check if a cache entry with a given hash exists, return boolean
    },
    async get(hash) {
        // return a cache entry with a given hash  
    },
    async set(hash, entry) {
        // save a cache entry with a given hash 
    },
}
```
