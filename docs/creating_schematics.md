# Creating Schematics

Schematics allow you to  generate or transform a project by creating, modifying, refactoring, or moving files and code.

## Glossary

- **collection**: description of all schematics existing in a package
- **schema**:  schematic configuration file
- **Tree:** representation of a  virtual file system that serves as a staging area
- **Rule**: a function that takes a `Tree` and outputs a modified `Tree`
- **Action**: an operation that transforms a `Tree`

## **Understanding Schematics**

Schematics is a toolkit developed by the angular CLI team which we adopted in Garment as the default for automated code generation and modification. 

Schematics work by applying changes to a Tree which consists of a virtual representation of your filesystem(you can think of it as a virtual DOM for your filesystem). This allows you to test your schematics without actually changing the filesystem, and if something goes wrong with your schematic, your project doesn't end up in an inconsistent state, which provides more safety for advanced code generation and modification. 

## Project Structure

A schematic is structured as a standard npm package with the following structure:

    schematics-my-schematics
      src/
        myFirstSchematic/
          index.js
          schema.json
    package.json
    collection.json

To get started you first need to install the schematics package

    yarn add @angular-devkit/schematics

**index.js**
```javascript
import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';

export function myFirstSchematic(_options: any): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    return tree;
  };
}
```
This is where you'll apply your changes into the `Tree`, this function is also known as a `RuleFactory`

**schema.json**
```json
{
  "$schema": "http://json-schema.org/schema",
  "id": "myFirstSchematic",
  "title": "My First Schematic",
  "type": "object",
  "properties": {
      "[name]": {
        "type": "string",
        "description": "string"
      }
  },
  "required": []
}
```

This is the schema of the options that are accepted by your `RuleFactory`

**collection.json**
```json
{
  "schematics": {
    "myFirstSchematic": {
      "description": "Detailed descrition goes here",
      "factory": "./lib/myFirstSchematic/index",
      "schema": "./lib/myFirstSchematic/schema.json"
    }
}
```
This informs the schematics engine about the existence of our schematics. If your schematics are not part of this object, they won’t run.

## Example

Let's create a schematic that generates a React component boilerplate

First of all let's create a template that will be used as a base for the generated component

```javascript
//files/__name.ts

import React, { Component } from 'react';

export class <%= className %> extends Component<<%= className %>Props> {
  render() {
    return (
      <h1>
      Welcome to <%= name %> component!
      </h1>
    );
  }
}

export default <%= className %>;
```

Then let's create a `RuleFactory` that will take the name of the component as a parameter and apply our changes into a `Tree` 
```javascript
import {
  Rule, SchematicsException,
  apply, mergeWith, template, url, move
} from '@angular-devkit/schematics';

// Type your options for a better DX
export interface ComponentOptions {
  name: string;
}

export default function (options: ComponentOptions): Rule {
  return () => {
    if (!options.name) {
      throw new SchematicsException('Option (name) is required.');
    }
    const templateSource = apply(
      url('./files'),
      [
        template({
          ...options,
        }),
        move('./components/')
      ],
    );
    return mergeWith(templateSource);
  };
}
```
Let's look into this example in more detail:

First of all we're checking for the existence of a mandatory option `name` , if the option is not provided we throw an exception with the `SchematicsException` helper.

Then we'll apply some changes into our `Tree` with the `apply` method, we give it a source which in this case will be our template, we use the `url` helper to get sources from our filesystem we then pass the necessary parameters to render the template with the `template` helper and we move it to our destination folder with the `move` helper. Finally, we merge the changes we've made to our `Tree` with the current filesystem.

**Running our schematic**

    garment generate myFirstSchematic --name mycomponentname