import { defineRunner } from '@garment/runner';
import * as DtsCreator from 'typed-css-modules';

/**
 * Generates types definitions for CSS modules
 */
export interface RunnerOptions {}

export default defineRunner(async (ctx) => {
  const { logger } = ctx;

  const typesCreator = new DtsCreator({
    rootDir: '.',
    searchDir: '.',
    outDir: '.',
  });

  logger.info(`Generating types for CSS modules`);

  ctx.input.forEach(async (file) => {
    const content = await typesCreator.create(
      file.path,
      file.data.toString('utf8')
    );

    return ctx.file.text(content.outputFilePath, content.formatted);
  });
});
