# @garment/plugin-runner-ts

<!-- description src/index.ts firstInterface -->
Runs TypeScript compiler


## Installation

<!-- installation -->
`npm i @garment/plugin-runner-ts`

or

`yarn add @garment/plugin-runner-ts`

## Example usage

<!-- example src/index.ts firstInterface -->
```json
{
    "runner": "ts",
    "input": "{{projectDir}}/src/**/*.ts",
    "output": "{{projectDir}}/lib",
    "options": {
        "configFile": "tsconfig.lib.json"
    }
}
```

## API

<!-- api src/index.ts firstInterface  -->
`configFile: path`

**Default:** `tsconfig.json`

Path to tsconfig.json file

