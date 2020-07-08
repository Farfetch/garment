import { defineRunner } from '@garment/runner';

/**
 * Copies files and folders.
 */
export interface CopyRunnerOptions {}

export default defineRunner(async ctx => {
  ctx.logger.info(`Copy files`);

  ctx.input(file => file);
});
