# runner-wdio

Runs Webdriver.

## Installation

`npm i @garment/plugin-runner-wdio`

or

`yarn add @garment/plugin-runner-wdio`

## Example usage

```json
{
  "runner": "wdio",
  "options": {
    "configFile": "wdio.conf.js",
    "testSpecsPath": "{{projectDir}}/tests/specs/**/*.js"
  }
}
```

## API

`configFile: string`

The config file to load Webdriver's config from.

`testSpecsPath: string`

The path to the specs.
