import { defineRunner, defineOptions } from '@garment/runner';
import * as Path from 'path';
import * as TJS from 'typescript-json-schema';
import * as matcher from 'matcher';

/**
 * Generates schema.json form an interface
 */
export interface RunnerOptions {
  /**
   * Pattern for interface name
   */
  pattern?: string;
}

export default defineRunner(
  defineOptions({ pattern: ['string?', '', '*'] }),
  async ctx => {
    const { pattern } = ctx.options;

    ctx.input(async files => {
      const filePaths = files.map(_ => _.absolutePath!).filter(Boolean);

      const program = TJS.getProgramFromFiles(filePaths, {});

      return files.map(file => {
        const generator = TJS.buildGenerator(
          program,
          { ignoreErrors: true, required: true },
          [file.absolutePath!]
        );
        if (!generator) {
          throw new Error(
            `Couldn't create TJS generator for "${file.absolutePath}"`
          );
        }

        const symbols = generator.getMainFileSymbols(program, [
          file.absolutePath!
        ]);

        const [firstSymbol] = matcher(symbols, [pattern]);

        if (!firstSymbol) {
          throw new Error(
            `Couldn't find an interface matching "${pattern}" in "${file.path}"`
          );
        }

        return ctx.file.json(
          Path.join(Path.dirname(file.path), 'schema.json'),
          generator.getSchemaForSymbol(firstSymbol)
        );
      });
    });
  }
);
