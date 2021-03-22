# @garment/plugin-runner-serve

<!-- description src/index.ts firstInterface -->
Serve the content of the directory


## Installation

<!-- installation -->
`npm i @garment/plugin-runner-serve`

or

`yarn add @garment/plugin-runner-serve`

## Example usage

<!-- example src/index.ts firstInterface -->
```json
{
    "runner": "serve",
    "options": {
        "publicDir": "{{projectDir}}/build",
        "port": "3000"
    }
}
```

## API

<!-- api src/index.ts firstInterface  -->
`publicDir: path`

The directory to serve files from

---

`port: number`

Port number

