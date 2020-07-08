# @garment/plugin-runner-next

<!-- description src/index.ts firstInterface -->
Runs Next.js


## Installation

<!-- installation -->
`npm i @garment/plugin-runner-next`

or

`yarn add @garment/plugin-runner-next`

## Example usage

<!-- example src/index.ts firstInterface -->
```json
{
    "runner": "next",
    "options": {
        "appPath": "{{projectDir}}"
    }
}
```

## API

<!-- api src/index.ts firstInterface  -->
`appPath: path`

Path to app

---

`command: "dev" | "start" | "build" | "export" | "telemetry"`

**Default:** `dev`

Command to execute

