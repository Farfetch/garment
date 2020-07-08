# @garment/plugin-runner-babel

<!-- description src/index.ts firstInterface -->
Allows you to transpile javascript files using [Babel](https://babeljs.io).


## Installation

<!-- installation -->
`npm i @garment/plugin-runner-babel`

or

`yarn add @garment/plugin-runner-babel`

## Example usage

<!-- example src/index.ts firstInterface -->
```json
{
    "runner": "babel",
    "input": "{{projectDir}}/src",
    "output": "{{projectDir}}/lib",
    "options": {
        "babelConfig": "babel.config.js",
        "env": "es",
        "sourceMaps": true
    }
}
```

## API

<!-- api src/index.ts firstInterface  -->
`configFile: path`

**Default:** `asdas`

Path to babel config

---

`env: string`

The current active environment used during configuration loading.

---

`babelrc: boolean`

Specify whether or not to use .babelrc and .babelignore files.

---

`sourceMaps: boolean`

Generate a sourcemap for the code

---

`sourceRoot: path`

The sourceRoot fields to set in the generated source map if one is desired.

