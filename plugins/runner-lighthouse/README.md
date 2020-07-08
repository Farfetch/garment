# @garment/plugin-runner-lighthouse

<!-- description src/index.ts firstInterface -->
Runs Lighthouse


## Installation

<!-- installation -->
`npm i @garment/plugin-runner-lighthouse`

or

`yarn add @garment/plugin-runner-lighthouse`

## Example usage

<!-- example src/index.ts firstInterface -->
```json
{
    "runner": "lighthouse",
    "output": "{{projectDir}}/lighthouse-output",
    "options": {
        "port": 3000,
        "budget": "{{projectDir}}/budget.json",
        "scoreThreshold": {
            "performance": 90,
            "accessibility": 90,
            "seo": 100,
            "pwa": 80,
            "best-practices": 80
        }
    }
}
```

## API

<!-- api src/index.ts firstInterface  -->
`url: string`

---

`port: number`

---

`chromeFlags: any`

---

`budget: path`

---

`scoreThreshold: { [key: string]: number; }`

---

`config: path`

---

`reportFormat: "html" | "json"`

