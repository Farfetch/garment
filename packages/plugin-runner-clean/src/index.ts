import { defineRunner } from '@garment/runner';
import del from 'del';

/**
 * Deletes files and folders using glob patterns.
 */
export interface CleanRunnerOptions {}

export default defineRunner(async function (ctx) {
  ctx.logger.info(`Removing files`);

  ctx.input.forEach(async ({ path, baseDir }) => {
    if (baseDir) {
      await del(path, {
        cwd: baseDir,
      });
    } else {
      throw new Error(`Unable to delete "${path}". baseDir is empty`);
    }
  });

  ctx.logger.success(`Files removed`);
});
