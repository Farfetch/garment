# Creating a Runner

A Runner is an abstraction to connect external tooling to Garment in order to perform common tasks such as lint, build and test.

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
