import { createHash } from 'crypto';
import { defineOptionsFromJSONSchema, defineRunner } from '@garment/runner';
import * as dependencyTree from 'dependency-tree';
import * as Path from 'path';
import * as postcss from 'postcss';

/**
 * Runs PostCSS
 * @example {
    "runner": "postcss",
    "input": "{{projectDir}}/src",
    "output": "{{projectDir}}/lib",
    "options": {
      "configFile": "postcss.config.js"
    }
  }
 */
export interface PostcssRunnerOptions {
  /**
   * The config file to load PostCSS config from.
   * @format path
   * @default postcss.config.js
   */
  configFile: string;
}

const keys: { [key: string]: string } = {};

export default defineRunner(
  defineOptionsFromJSONSchema<PostcssRunnerOptions>(require('./schema.json')),
  async ctx => {
    const { configFile } = ctx.options;

    const cacheKeysHash = getCacheKeys();

    const plugins = require(configFile).plugins;

    ctx.dependsOnFile(configFile);

    ctx.logger.info(`Transpiling files with PostCSS`);

    ctx.input.forEach(async file => {
      const { absolutePath, path, data } = file;
      const content = data.toString('utf8');
      const fileName = absolutePath || path;

      const outputContainer = ctx.createOutputContainer(file, [
        cacheKeysHash,
        content,
        path
      ]);

      if (await outputContainer.isNotCached) {
        ctx.logger.debug('[PostCSS] Processing', path);
        const result = await postcss(plugins).process(content, {
          from: fileName
        });

        outputContainer.add(ctx.file.text(path, result.css));
      } else {
        ctx.logger.debug('[PostCSS] Found in cache', path);
      }

      return outputContainer;
    });

    function getCacheKeys() {
      if (keys[configFile]) {
        return keys[configFile];
      }

      let tree = dependencyTree.toList({
        filename: configFile,
        directory: Path.dirname(configFile)
      });

      keys[configFile] = tree
        .reduce((hash, dep) => {
          const content = ctx.fs.readFileSync(dep, 'utf8');
          hash.update(content);
          return hash;
        }, createHash('md5'))
        .digest('hex');

      return keys[configFile];
    }
  }
);
