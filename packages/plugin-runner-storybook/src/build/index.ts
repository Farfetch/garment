import {
  defineOptionsFromJSONSchema,
  defineRunner,
  defineWatch
} from '@garment/runner';

import storybook = require('@storybook/react/standalone');

/**
 * Build storybook
 */
export interface StorybookBuildRunnerOptions {
  /**
   * The config folder to build Storybook from
   * @format path
   * @default {{projectDir}}/.storybook
   */
  configDir?: string;
}

export const storybookRunnerOptions = defineOptionsFromJSONSchema<
  StorybookBuildRunnerOptions
>(require('./schema.json'));

export default defineRunner(storybookRunnerOptions, async ctx => {
  const { outputDir, configDir } = ctx.options;

  await storybook({
    mode: 'static',
    outputDir,
    configDir
  });
  ctx.logger.success('Building Storybook');
});

export const watch = defineWatch(storybookRunnerOptions, async ctx => {
  const { outputDir, configDir } = ctx.options;

  return storybook({
    mode: 'static',
    outputDir,
    configDir,
    watch: true
  });
});
