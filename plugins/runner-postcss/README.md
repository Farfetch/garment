# @garment/plugin-runner-postcss

<!-- description src/index.ts firstInterface -->
Runs PostCSS


## Installation

<!-- installation -->
`npm i @garment/plugin-runner-postcss`

or

`yarn add @garment/plugin-runner-postcss`

## Example usage

<!-- example src/index.ts firstInterface -->
```json
{
    "runner": "postcss",
    "input": "{{projectDir}}/src",
    "output": "{{projectDir}}/lib",
    "options": {
        "configFile": "postcss.config.js"
    }
}
```

## API

<!-- api src/index.ts firstInterface  -->
`configFile: path`

**Default:** `postcss.config.js`

The config file to load PostCSS config from.

