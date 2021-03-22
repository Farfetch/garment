# @garment/plugin-runner-publish

<!-- description src/index.ts firstInterface -->
Packs and publishes packages


## Installation

<!-- installation -->
`npm i @garment/plugin-runner-publish`

or

`yarn add @garment/plugin-runner-publish`

## Example usage

<!-- example src/index.ts firstInterface -->
```json
{
    "runner": "publish"
}
```

## API

<!-- api src/index.ts firstInterface  -->
`npmrc: path`

The npm config file to use

---

`errorIfPublished: boolean`

Output error instead of warning in case of package was already published

---

`tag: string`

Tag to use

