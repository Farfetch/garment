import { defineRunner, defineOptionsFromJSONSchema } from '@garment/runner';
import { parseOptions, resolveBin } from './utils';
import execa = require('execa');

/**
 * Executes system or node binary file with given args.
 * @example {
    "runner": "bin",
    "options": {
      "bin": "echo",
      "args": "garment is phenomenal"
    }
  }
 */
export interface BinRunnerOptions {
  /**
   * The name of the binary to execute. Garment will look up the path with the bin name you provided.
   */
  bin?: string;

  /**
   * The arguments to pass to the given `bin`.
   */
  args?: string | string[] | { [key: string]: boolean | string | string[] };

  /**
   * Environment variables
   */
  env?: { [key: string]: string | undefined };

  /**
   * Stream all the console output, otherwise it will be collected and output after the execution
   */
  stream?: boolean;

  /**
   * Not wait until the process is finished
   */
  longRunning?: boolean;
}

export default defineRunner(
  defineOptionsFromJSONSchema<BinRunnerOptions>(require('./schema.json')),
  async ctx => {
    const { logger, options, project, workspace, renderTemplate } = ctx;
    const { stream, env, longRunning = false } = options;
    const [binOption, ...args] = parseOptions(options).map(arg =>
      renderTemplate(arg, { projectDir: project.fullPath })
    );

    const bin = await resolveBin(binOption, workspace.cwd);
    logger.debug('bin:', bin);
    logger.debug('args:', args);

    try {
      const promise = execa(bin, args, {
        cwd: ctx.project.fullPath,
        stdin: 'inherit',
        stdout: stream ? 'inherit' : 'pipe',
        stderr: stream ? 'inherit' : 'pipe',
        env
      });

      if (!longRunning) {
        const { stderr, stdout } = await promise;

        if (!stream) {
          logger.info(stdout);
          if (stderr) {
            logger.info(stderr);
          }
        }
      }
    } catch (error) {
      if (!stream) {
        logger.info(error.stdout);
        logger.error(error.stderr);
      }
    }
  }
);
