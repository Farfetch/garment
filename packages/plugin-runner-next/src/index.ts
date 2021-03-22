import { defineRunner, defineOptionsFromJSONSchema } from '@garment/runner';
import execa = require('execa');

/**
 * Runs Next.js
 * @example {
    "runner": "next",
    "options": {
      "appPath": "{{projectDir}}"
    }
  }
 */
interface NextRunnerOptions {
  /**
   * Path to app
   * @format path
   */
  appPath: string;

  /**
   * Command to execute
   * @default dev
   */
  command?: 'dev' | 'start' | 'build' | 'export' | 'telemetry';
}

export default defineRunner(
  defineOptionsFromJSONSchema<NextRunnerOptions>(require('./schema.json')),
  async ctx => {
    const { options } = ctx;
    const { appPath, command = 'dev' } = options;

    await execa('next', [command], {
      cwd: appPath,
      stderr: 'inherit',
      stdout: 'inherit'
    });
  }
);
