# Creating a Runner

A Runner is an abstraction to connect external tooling to Garment in order to perform common tasks such as lint, build and test.
# Table of Contents

1. [Project structure](#project-structure)   
2. [Example](#example)  
3. [Caching](#caching)  
4. [The runner Context](#context)  
    4.1 [Garment](#garment)  
    4.2 [Tooling Box](#tooling-box)
5. [Long Running and Cleanup](#long-running-and-cleanup)
6. [Creating a Batch Runner](#creating-a-batch-runner)  
    6.1 [Motivation](#motivation)  
    6.2 [Instructions](#instructions)  
    6.3 [Caveats](#caveats)

## **Project Structure**

A Runner is structured as a standard npm package with the following structure:

    plugin-runner-[runner-name]
      src/
        index.js
    package.json

**index.js**

In the simplest case, the runner handler function should be wrapped to the `defineRunner` call and exported as a default.

```javascript
import { defineRunner } from '@garment/runner';

export default defineRunner(async ctx => {
  const options = ctx.options; // options can have any properties

  ctx.logger.debug('This is my first Runner! Option: ' + options.value);
});
```

In order to validate options before executing the runner, we can create `schema.json` file and pass it as the first argument to `defineRunner`.

```js
import { defineRunner, defineOptionsFromJSONSchema } from '@garment/runner';

export default defineRunner(
  defineOptionsFromJSONSchema(require('./schema.json')),
  async ctx => {
    const options = ctx.options; // options are validated
    // ...
  }
);
```

For the runner implemented in TypeScript, we can also pass the type of options as a generic argument.

```ts
import { defineRunner, defineOptionsFromJSONSchema } from '@garment/runner';

interface OptionsInterface {
  // ...
}

export default defineRunner(
  defineOptionsFromJSONSchema<OptionsInterface>(require('./schema.json')),
  async ctx => {
    const options = ctx.options; // options has OptionsInterface type
    // ...
  }
);
```

Also, we can use `runner-typescript-json-schema` in order to automatically generate `schema.json` based on the interface declaration.

## **Example**

Let's implement a Runner called Emojinator that for each file from the input outputs the same file but with an each line prepended with emoji.

We recommend writing all runners using typescript

```ts
import { defineRunner, defineOptionsFromJSONSchema } from '@garment/runner';

export interface NameCheckRunnerOptions {
  emoji?: string;
}

export default defineRunner(
  defineOptionsFromJSONSchema<NameCheckRunnerOptions>(require('./schema.json')),
  async ctx => {
    const { emoji = '😬' } = ctx.options;

    ctx.logger.info('We are about to emojify the files...');

    ctx.input(file => {
      const content = file.data.toString('utf8'); // Since data is of type Buffer we need to convert it to string

      return ctx.file.text(
        file.path,
        content
          .split('\n')
          .map(line => emoji + line)
          .join('\n')
      );
    });
  }
);
```

You can see that there are a few more things going on here.

First of all, we've defined an interface for our options `<NameCheckRunnerOptions>`, then we need some kind of context for us to know in which package is our Runner performing its work and to be able to access it's input files and configurations.

We also see more extensive use of the `ctx` argument which stands for `context`. Besides `options` and `logger` context provides various utilities and methods to control the execution and create an output including cached output.
We use the `ctx.input(InputCallback)` method in order to receive and process files one by one. It gives us an advantage that if we run the task in a watch mode(e.g. `$ garment emojify my-lib --watch`) when one of the input files is changed Garment will only execute that `InputCallback` for that file without a need to restart the whole runner handler. It's useful when before reading from the input we did some expensive preparations so we don't want them to be executed for each file and for any subsequent change in a watch mode.

In order to output a file from the `InputCallback` we need to create it with a helper method `ctx.file.text(relativePath, content)`, there's also `ctx.file.json` method with the same signature. An array of files can be returned as well, e.g. in the situations when for each input file we generate transpiled one and a source map.

Sometimes we need to be able to read all the files at once and execute a whole runner handler for a change in any of those files. In this case, we don't provide `InputCallback` but at the same time we need to `await` until the input files are ready:

```ts
defineRunner(async ctx => {
  ctx.logger.info('We are about to bundle all the files...');

  const [allFiles] = await ctx.input();

  const bundle = allFiles.join('\n');

  return ctx.file.text('bundle.js', bundle);
});
```

Now, if we change any of the input files, the runner will rebundle all of them again. As you noticed, we had to use array destructuring in order to get `allFiles` array here:

```ts
const [allFiles] = await ctx.input();
```

That's because there's a second element in that tuple which we use if in the first execution of the runner we want to have all the input files and then only process changed files in the watch mode:

```ts
defineRunner(async ctx => {
  ctx.logger.info('We are about to bundle all the files...');

  const [allFiles, onInputChange] = await ctx.input();

  let bundle = allFiles.map(file => file.data.toString('utf8')).join('\n');

  onInputChange(file => {
    bundle = updateBundleIncrementaly(file);

    return ctx.file.text('bundle.js', bundle);
  });

  return ctx.file.text('bundle.js', bundle);
});
```

### **Caching**

Caching makes sense when in order to process a single file we have to perform some costly operations, e.g. transpiling with a type-checking. In this case, Garment provides a useful abstraction called `OutputContainer`. Its purpose is to create a mapping between the cache keys(which are the minimal information identifying the input) and the output files:

```ts
defineRunner(async ctx => {
  const { target = 'es5' } = ctx.options;

  ctx.input(file => {
    const content = file.data.toString('utf8');

    const outputContainer = ctx.createOutputContainer([content, target]);

    if (await outputContainer.isNotCached) {
      const { result, sourceMap } = performCostlyTransform(content, { target });

      outputContainer.add(ctx.file.text(file.path, result));
      outputContainer.add(ctx.file.text(file.path + '.map', sourceMap));
    }

    return outputContainer;
  });
});
```

As you can see, using `OutputContainer` allowed us to verify if there exists a cached output for a given input, namely, file content + target option, and not perform costly transform in case it's already cached so we can just return an `outputContainer` and Garment will get the cached output.

## **Context**

Let's review what else `ctx` object contains

```ts
defineRunner(async ctx => {
  // Options object always has outputDir field. It points to the temporary directory provided by Garment in order to collect an output of runners which for some reason can't return File or OutputContainer objects
  const { outputDir } = ctx.options;

  // Workspace object
  const { cwd } = ctx.workspace;

  // Project object
  const { fullPath, name, nodePackage } = ctx.project;

  // A way to tell Garment that it needs to rerun the whole handler if the specified file changed in a watch mode
  ctx.dependsOnFile(configFile);

  // Called if the current runner requires dependencies to be watched, e.g. storybook runner
  ctx.watchDependencies();

  // A way to specify a callback function to be called before Garment exits so it doesn't end up with hanging event listeners
  ctx.longRunning(() => clearResourses());

  // Used when a runner is in a batch mode, in order to receive all the projects and their options
  const allProjectsAndTheirOptions = ctx.batch();

  // Utility to render templates, already has projectDir variable built-in
  const rendered = ctx.renderTemplate('{{projectDir}}/{{fileName}}', {
    fileName: 'foo.txt'
  });

  // FS object
  const data = ctx.fs.readFileSync('/path/to/file.js', 'utf8');
});
```

## **Long Running and Cleanup**

Long running is a feature for chained tasks (ie, tasks which use next or pre, post, etc).  Some sub-tasks in a chained task 
may be long running and need to clean up resources when the entire task is exited.  `ctx.longRunning` allows you to do this.
In the following example, runner-web-server will be run, then runner-docker-compose will be run, both of which are long running.
When runner-wdio finishes executing all of our E2E tests, the `ctx.longRunning` callback in both `runner-docker-compose` and `runner-web-server` will be invoked.

Example chained task from garment.json:
```json
"test-e2e": {
  "runner": "runner-web-server",
  "options": {
    "port": 4000,
  },
  "next": {
    "runner": "runner-docker-compose",
    "options": {
      "file": "docker-compose-selenium.yml",
    },
    "next": {
      "runner": "runner-wdio",
      "options": {
        "configFile": "./wdio.conf.js",
      }
    }
  }
}
```
Example snippet from runner-docker-compose:
```ts
logger.success(`Docker Compose has been started, press CTRL + C to exit`);
    const cleanup = () => {
        logger.info(`Stopping Docker Compose...`);
        dockerComposeDown(file);
        logger.success(`Docker Compose has been successfully stopped`);
    };

    context.longRunning(cleanup);
```

Your longRunning callback will **NOT** be invoked if garment is terminated in other ways (ie, Ctrl + C).  If you need to 
cleanup on Ctrl + C as well for example, such cleanup logic must be done manually.  Here's an example using [exit-hook](https://www.npmjs.com/package/exit-hook):

...
```ts
logger.success(`Docker Compose has been started, press CTRL + C to exit`);
    const cleanup = () => {
        logger.info(`Stopping Docker Compose...`);
        dockerComposeDown(file);
        logger.success(`Docker Compose has been successfully stopped`);
    };

    context.longRunning(cleanup);
    exitHook(cleanup);
```

## **Creating a Batch Runner**

### **Motivation**

Garment can run the same task on multiple projects simultaneously by using the `--projects` flag [see CLI docs](./CLI.md).
In this case, by default, the runner will be executed once for each project.  This can cause issues in several circumstances - if a 
runner uses the same port for multiple projects, later invocations may try to connect to the same (now occupied) port, running 20 jest instances may be 
very heavy on resources, etc.  By using batch mode, you can have your runner invoked only one time for multiple projects.

### **Instructions**

The first step to creating a batch runner is to create a runners.json file in the root, next to your package.json.
For the handler that will run in batch mode, we set the batch property to true:

```json
{
  "runners": {
    "default": {
      "handler": "./lib/default",
      "description": "Runs wdio in batch mode",
      "batch": true
    },
    "single": {
      "handler": "./lib/default#singleRunner",
      "description": "Runs wdio"
    }
  }
}
```
Let's say our package is called `runner-wdio`.  In our garment.json file, to use the batch runner, all we do is use 
`runner-wdio` for our runner property of our task.  To use the singleRunner, we use `runner-wdio:single`.  This 
runners.json file must be included when we publish our package.

By marking our handler with batch true, we now can proceed to the second step, using `ctx.batch()`.
The result of invoking `ctx.batch()` is an iterable in which each item contains a project property, and 
an options property which are the options for that specific project:

```ts
export default defineRunner(
  defineOptionsFromJSONSchema<WdioRunnerOptions>(require('./schema.json')),
  async ctx => {
    for (const item of ctx.batch()) {
      const { configFile } = item.options;
      console.log('options: ', item.options);
      console.log('project: ', item.project);

      const wdioLauncher = new Launcher(configFile, {
        specs: [testSpecsPath]
      });

      await wdioLauncher.run();
    }
  }
);
```

In this case, we create a new Launcher for each project, but we could have just as easily use a single Launcher for all projects.

### **Caveats**

Some features are not currently supported in batch mode, most notably, `ctx.input()`.  Design suggestions and use cases are welcome so please feel free to open an issue.