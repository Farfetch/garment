import { defineRunner, defineOptionsFromJSONSchema } from '@garment/runner';
import http = require('http');
import handler = require('serve-handler');

/**
 * Serve the content of the directory
 * @example {
 *   "runner": "serve",
 *   "options": {
 *     "publicDir": "{{projectDir}}/build",
 *     "port": "3000"
 *   }
 * }
 */
interface ServeRunnerOptions {
  /**
   * The directory to serve files from
   * @format path
   */
  publicDir?: string;

  /**
   * Port number
   */
  port?: number;
}

export default defineRunner(
  defineOptionsFromJSONSchema<ServeRunnerOptions>(require('./schema.json')),
  async (ctx) => {
    const { logger, options } = ctx;
    const { publicDir, port = 3000 } = options;

    const server = http.createServer((request: any, response: any) => {
      return handler(request, response, { public: publicDir });
    });

    const listen = (port: number) => {
      return new Promise((resolve, reject) => {
        server.on('error', (err) => reject(err));
        server.listen(port, () => {
          logger.log(`Running at http://localhost:${port}`);
          resolve();
        });
      });
    };

    await listen(port);

    ctx.longRunning(() => {
      server.close();
    });
  }
);
