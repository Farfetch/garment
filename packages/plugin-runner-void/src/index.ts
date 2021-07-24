import { defineOptionsFromJSONSchema, defineRunner } from '@garment/runner';

interface VoidRunnerOptions {
  delay: number;
}

export default defineRunner(
  defineOptionsFromJSONSchema<VoidRunnerOptions>(require('./schema.json')),
  async (ctx) => {
    const { logger, options } = ctx;
    const { delay = 1 } = options;
    logger.debug(`Delay is ${delay}ms`);

    ctx.dependsOnFile('/Users/maxim.valenko/src/monoscript/tsconfig.test.json');

    ctx.input.forEach(async (file) => {
      logger.debug(`Processing ${file.path}`);

      const content = file.data.toString('utf8');
      const outputContainer = ctx.createOutputContainer(
        file,
        [content],
        ['/Users/maxim.valenko/src/monoscript/README.md']
      );

      if (await outputContainer.isNotCached) {
        logger.debug('not cached');
        await new Promise((resolve) => setTimeout(resolve, delay));
        outputContainer.add(
          ctx.file.text(
            `aodod/${file.path}/goo.txt`,
            content.split('\n').join('🤬\n')
          )
        );
        outputContainer.add(
          ctx.file.text(
            `aodod/${file.path}/fac.txt`,
            content.split('\n').join('😜\n')
          )
        );
      }

      logger.info(file.path);

      return outputContainer;
    });

    // await new Promise(resolve => setTimeout(resolve, delay));
  }
);
