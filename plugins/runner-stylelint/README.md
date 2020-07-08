# @garment/plugin-runner-stylelint

<!-- description src/index.ts firstInterface -->
Runs stylelint


## Installation

<!-- installation -->
`npm i @garment/plugin-runner-stylelint`

or

`yarn add @garment/plugin-runner-stylelint`

## Example usage

<!-- example src/index.ts firstInterface -->
```json
{
    "runner": "stylelint",
    "input": "{{projectDir}}/src/**/*.css",
    "output": "{{projectDir}}/lib",
    "options": {
        "configFile": ".stylelintconfig.json",
        "fix": true
    }
}
```

## API

<!-- api src/index.ts firstInterface  -->
`configFile: path`

The config file to load stylelint config from

---

`fix: boolean`

Fix automatically linting errors

