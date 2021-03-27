import {
  defineOptionsFromJSONSchema,
  defineRunner,
  File,
} from '@garment/runner';
import * as prettier from 'prettier';

interface PrettierRunnerOptions {
  /**
   * The config file to load Prettier's configuration from.
   * @format path
   */
  configFile?: string;

  /**
   * Fix automatically linting errors.
   */
  fix?: boolean;
}

const runnerOptions = defineOptionsFromJSONSchema<PrettierRunnerOptions>(
  require('./schema.json')
);

export default defineRunner(runnerOptions, async (ctx) => {
  const { logger } = ctx;
  const { configFile = '', outputDir, fix: fixFlag } = ctx.options;
  const fix = Boolean(outputDir) && fixFlag;

  logger.info(`Linting files with Prettier`);
  ctx.input(async (files) => {
    const fixes: File[] = [];

    const prettierConfig = await prettier.resolveConfig(configFile);
    // TODO validate that the config exists maybe

    files.forEach((file) => {
      //TODO What to do about errors like this?
      // error SyntaxError: Unexpected token, expected ";" (2:11)
      const isPrettified = prettier.check(file.data.toString('utf8'), {
        ...prettierConfig,
        filepath: file.absolutePath,
      });

      // If is not prettified and is to fix
      if (!isPrettified && fix) {
        logger.warn(`output`, file.data.toString('utf8'));
        const output = prettier.format(file.data.toString('utf8'), {
          ...prettierConfig,
          filepath: file.absolutePath,
        });

        fixes.push(ctx.file.text(file.path, output));
      }
    });

    return fixes;
  });
});
