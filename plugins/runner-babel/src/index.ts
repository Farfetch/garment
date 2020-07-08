import * as babel from '@babel/core';
import { defineOptionsFromJSONSchema, defineRunner } from '@garment/runner';
import * as Path from 'path';

/**
 * Allows you to transpile javascript files using [Babel](https://babeljs.io).
 * @example {
    "runner": "babel",
    "input": "{{projectDir}}/src",
    "output": "{{projectDir}}/lib",
    "options": {
      "babelConfig": "babel.config.js",
      "env": "es",
      "sourceMaps": true
    }
  }
 */
export interface BabelRunnerOptions {
  /**
   * Path to babel config
   * @format path
   * @defaultDescription asdas
   */
  configFile?: string;

  /**
   * The current active environment used during configuration loading.
   */
  env?: string;

  /**
   * Specify whether or not to use .babelrc and .babelignore files.
   */
  babelrc?: boolean;

  /**
   * Generate a sourcemap for the code
   */
  sourceMaps?: boolean;

  /**
   * The sourceRoot fields to set in the generated source map if one is desired.
   * @format path
   */
  sourceRoot?: string;
}

const runnerOptions = defineOptionsFromJSONSchema<BabelRunnerOptions>(
  require('./schema.json')
);

export default defineRunner(runnerOptions, async ctx => {
  const { logger, file, workspace } = ctx;
  const { configFile, env, sourceRoot, sourceMaps, babelrc } = ctx.options;

  logger.info(`Transpiling files with Babel`);

  const optionsByConfigKey: { [key: string]: object | null } = {};

  ctx.input.forEach(async inputFile => {
    const { data, path, absolutePath } = inputFile;
    const partialConfig = babel.loadPartialConfig({
      cwd: workspace.cwd,
      babelrc,
      filename: absolutePath,
      configFile,
      envName: env,
      sourceMaps,
      sourceRoot
    });

    const configDependencies = [
      partialConfig?.babelrc,
      partialConfig?.config,
      partialConfig?.babelignore
    ].filter(Boolean) as string[];

    const configKey = configDependencies.join('-');
    if (!optionsByConfigKey[configKey]) {
      optionsByConfigKey[configKey] = babel.loadOptions(partialConfig?.options);
    }
    const loadedOptions = optionsByConfigKey[configKey];

    const cacheKeys = [
      JSON.stringify({
        env,
        sourceMaps,
        sourceRoot: sourceRoot && workspace.relative(sourceRoot)
      }),
      babel.version
    ];

    if (loadedOptions) {
      const { plugins, presets } = loadedOptions as any;
      [...plugins, ...presets].forEach((plugin: any) => {
        cacheKeys.push(plugin.key + JSON.stringify(plugin.options || {}));
      });
    }

    const output = ctx.createOutputContainer(
      inputFile,
      [...cacheKeys, data.toString('utf8'), path],
      configDependencies
    );

    if (await output.isNotCached) {
      logger.debug('[Babel] Processing', path);

      const config = {
        ...loadedOptions,
        sourceFileName: absolutePath,
        filename: absolutePath
      };

      const ast = babel.parse(data.toString('utf8'), config);
      const { dir = '', name } = Path.parse(path);
      const outputPath = Path.join(dir, `${name}.js`);

      if (ast) {
        const result = babel.transformFromAstSync(ast, undefined, config);

        if (result) {
          const sourceMapRelativePath = outputPath + '.map';
          output.add(
            file.text(
              outputPath,
              result.code +
                (result.map
                  ? `\n\n//# sourceMappingURL=${Path.basename(
                      sourceMapRelativePath
                    )}`
                  : '')
            )
          );
          if (result.map) {
            output.add(file.json(sourceMapRelativePath, result.map));
          }
        }
      }
    } else {
      logger.debug('[Babel] Found in cache', path);
    }

    return output;
  });
});
