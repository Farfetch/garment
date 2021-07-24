import {
  defineOptions,
  defineOptionsFromJSONSchema,
  defineRunner,
} from '@garment/runner';
import Launcher from '@wdio/cli';

export interface WdioRunnerOptions {
  /**
   * @format path
   * @default {{projectDir}}/test/specs
   */
  testSpecsPath: string;

  /**
   * @format path
   * @default 'wdio.conf.js'
   */
  configFile: string;
}

export default defineRunner(
  defineOptionsFromJSONSchema<WdioRunnerOptions>(require('./schema.json')),
  async (ctx) => {
    for (const item of ctx.batch()) {
      const { configFile, testSpecsPath } = item.options;

      const wdioLauncher = new Launcher(configFile, {
        specs: [testSpecsPath],
      });

      await wdioLauncher.run();
    }
  }
);

export const singleRunner = defineRunner(
  defineOptions({
    testSpecsPath: ['path?', '', 'wdio.conf.js'],
    configFile: ['path?', '', '{{projectDir}}/test/specs'],
  }),
  async (ctx) => {
    const { configFile, testSpecsPath } = ctx.options;

    const wdioLauncher = new Launcher(configFile, {
      specs: [testSpecsPath],
    });

    await wdioLauncher.run();
  }
);
