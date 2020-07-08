# @garment/plugin-runner-jest

<!-- description src/index.ts firstInterface -->
Runs Jest


## Installation

<!-- installation -->
`npm i @garment/plugin-runner-jest`

or

`yarn add @garment/plugin-runner-jest`

## Example usage

<!-- example src/index.ts firstInterface -->
```json
{
    "runner": "jest",
    "options": {
        "jestConfig": "jest.config.js"
    }
}
```

## API

<!-- api src/index.ts firstInterface  -->
`configFile: path`

**Default:** `jest.config.js`

The config file to load Jest's config from.

---

`testPathPattern: string`

---

`updateSnapshot: boolean`

---

`u: boolean`

---

`_: string | boolean`

