# @garment/plugin-runner-bin

<!-- description src/index.ts firstInterface -->
Executes system or node binary file with given args.


## Installation

<!-- installation -->
`npm i @garment/plugin-runner-bin`

or

`yarn add @garment/plugin-runner-bin`

## Example usage

<!-- example src/index.ts firstInterface -->
```json
{
    "runner": "bin",
    "options": {
        "bin": "echo",
        "args": "garment is phenomenal"
    }
}
```

## API

<!-- api src/index.ts firstInterface  -->
`bin: string`

The name of the binary to execute. Garment will look up the path with the bin name you provided.

---

`args: string | string[] | { [key: string]: string | boolean | string[]; }`

The arguments to pass to the given `bin`.

---

`env: { [key: string]: string; }`

Environment variables

---

`stream: boolean`

Stream all the console output, otherwise it will be collected and output after the execution

---

`longRunning: boolean`

Not wait until the process is finished

