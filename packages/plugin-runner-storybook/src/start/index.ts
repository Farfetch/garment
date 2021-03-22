import { defineOptionsFromJSONSchema, defineRunner } from '@garment/runner';

import storybook = require('@storybook/react/standalone');

/**
 * Start Storybook in development mode
 * @example {
    "runner": "storybook",
    "options": {
      "configDir": "{{projectDir}}/.storybook",
      "port": 3001,
      "host": "localhost"
    }
  }
 */
export interface StorybookStartRunnerOptions {
  /**
   * The config folder to start Storybook from
   * @format path
   * @default {{projectDir}}/.storybook
   */
  configDir?: string;

  /**
   * Port to serve Storybook
   * @default 9009
   */
  port?: number;

  /**
   * Host to serve Storybook
   * @default localhost
   */
  host?: string;
}

export default defineRunner(
  defineOptionsFromJSONSchema<StorybookStartRunnerOptions>(
    require('./schema.json')
  ),
  async ctx => {
    const { port, host, configDir } = ctx.options;

    process.env.NODE_ENV = process.env.NODE_ENV || 'development';

    ctx.watchDependencies();

    return storybook({
      mode: 'dev',
      configDir,
      host,
      port
    });
  }
);
