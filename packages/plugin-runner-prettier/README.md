# @garment/plugin-runner-prettier

<!-- description src/index.ts firstInterface -->
Runs Prettier

## Installation

<!-- installation -->
`npm i @garment/plugin-runner-prettier`

or

`yarn add @garment/plugin-runner-prettier`

## Example usage

<!-- example src/index.ts firstInterface -->
```json
{
    "runner": "prettier",
    "input": "{{projectDir}}/src/**/*.json",
    "options": {
        "configFile": ".prettierrc.json"
    }
}
```

## API

<!-- api src/index.ts firstInterface  -->
`configFile: path`

The config file to load Prettier's configuration from.

---

`fix: boolean`

Fix automatically linting errors.
