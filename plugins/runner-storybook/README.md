# runner-storybook

Runs Storybook.

## Installation

`npm i @garment/plugin-runner-storybook`

or

`yarn add @garment/plugin-runner-storybook`

## start

<!-- description src/start/index.ts firstInterface -->
Start Storybook in development mode


### Example usage

<!-- example src/start/index.ts firstInterface -->
```json
{
    "runner": "storybook",
    "options": {
        "configDir": "{{projectDir}}/.storybook",
        "port": 3001,
        "host": "localhost"
    }
}
```

### API

<!-- api src/start/index.ts firstInterface  -->
`configDir: path`

**Default:** `{{projectDir}}/.storybook`

The config folder to start Storybook from

---

`port: number`

**Default:** `9009`

Port to serve Storybook

---

`host: string`

**Default:** `localhost`

Host to serve Storybook


## build

<!-- description src/build/index.ts firstInterface -->
Build storybook


### API

<!-- api src/build/index.ts firstInterface  -->
`configDir: path`

**Default:** `{{projectDir}}/.storybook`

The config folder to build Storybook from

