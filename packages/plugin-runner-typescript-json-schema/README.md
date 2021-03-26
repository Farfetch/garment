# @garment/plugin-runner-typescript-json-schema

<!-- description src/index.ts firstInterface -->
Generates schema.json from an interface


## Installation

<!-- installation -->
`npm i @garment/plugin-runner-typescript-json-schema`

or

`yarn add @garment/plugin-runner-typescript-json-schema`

## Example usage

<!-- example src/index.ts firstInterface -->
```json
{
    "runner": "typescript-json-schema",
    "input": "{{projectDir}}/src/**/index.ts",
    "output": [ "{{projectDir}}/lib", "{{projectDir}}/src"],
    "options": {
        "pattern": "*Options"
    }
}
```

## API

<!-- api src/index.ts firstInterface  -->
`pattern: string`

Pattern for interface name

