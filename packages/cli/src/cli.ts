#!/usr/bin/env node

// Polyfilling Symbol.asyncIterator, required for running on node 8.16.x
if (typeof Symbol === undefined || !(Symbol as any).asyncIterator) {
  (Symbol as any).asyncIterator = Symbol.for('Symbol.asyncIterator');
}

import log from '@garment/logger';
import { setConfig } from '@garment/perf';
import * as yargs from 'yargs';
import * as depGraphCommand from './commands/dep-graph/command';
import * as actionGraphCommand from './commands/action-graph/command';
import * as generateCommand from './commands/generate/command';
import * as cacheCommand from './commands/cache/command';
import * as initCommand from './commands/init/command';
import * as tasksCommand from './commands/tasks/command';
import * as projectsCommand from './commands/projects/command';
import { defaults } from './defaults';

function logError(error?: string) {
  log.error(error);
  process.exitCode = 1;
}

process.on('unhandledRejection', (err: any) => {
  logError(err.stack);
});

defaults(yargs)
  .parserConfiguration({ 'strip-dashed': true } as any)
  .alias('h', 'help')
  .alias('v', 'version')
  .option('loglevel', { type: 'string', default: 'warn' })
  .group(['help', 'version', 'loglevel'], 'Global Options:')
  .command(generateCommand)
  .command(depGraphCommand)
  .command(actionGraphCommand)
  .command(cacheCommand)
  .command(initCommand)
  .command(tasksCommand)
  .command(projectsCommand)
  .scriptName('garment')
  .middleware((argv) => {
    const { perf, loglevel } = argv;

    if (perf) {
      setConfig({
        print: true,
        filter:
          typeof perf === 'string'
            ? (measure) =>
                measure.name.toLowerCase().includes(perf.toLowerCase())
            : typeof perf === 'number'
            ? (measure) => measure.duration >= perf
            : () => true,
      });
    }
    if (typeof loglevel === 'string' && loglevel) {
      log.setLevel(loglevel as any);
    }
  })
  .fail(function (msg, error) {
    /**
     * @types/yargs does not support the callback 3rd argument,
     * so we need to get it like arguments[2]
     */
    const yargs = arguments[2];
    if (yargs && !error) {
      console.error(yargs.help());
    }
    logError(msg || error.stack || error.toString());
    process.exit(1);
  })
  .demandCommand(1, 'You need at least one command before moving on')
  .help().argv;
