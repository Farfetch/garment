# @garment/plugin-runner-eslint

<!-- description src/index.ts firstInterface -->
Runs ESLint


## Installation

<!-- installation -->
`npm i @garment/plugin-runner-eslint`

or

`yarn add @garment/plugin-runner-eslint`

## Example usage

<!-- example src/index.ts firstInterface -->
```json
{
    "runner": "eslint",
    "input": "{{projectFolder}}/src",
    "options": {
        "configFile": ".eslintconfig.json"
    }
}
```

## API

<!-- api src/index.ts firstInterface  -->
`configFile: path`

The config file to load ESLint's configuration from.

---

`fix: boolean`

Fix automatically linting errors.

