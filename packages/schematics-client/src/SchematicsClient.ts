#!/usr/bin/env node
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// symbol polyfill must go first
// tslint:disable-next-line:ordered-imports import-groups
import {
  JsonObject,
  normalize,
  schema,
  tags,
  terminal,
  virtualFs,
} from '@angular-devkit/core';
import { createConsoleLogger, NodeJsSyncHost } from '@angular-devkit/core/node';
import {
  DryRunEvent,
  SchematicEngine,
  UnsuccessfulWorkflowExecution,
} from '@angular-devkit/schematics';
import {
  NodeModulesEngineHost,
  NodeWorkflow,
} from '@angular-devkit/schematics/tools';
import * as inquirer from 'inquirer';
import 'symbol-observable';

export class SchematicsClient {
  parseSchematicName(str: string) {
    let collection;

    let schematic = str;
    if (schematic && schematic.indexOf(':') != -1) {
      [collection, schematic] = schematic.split(':', 2);
    }

    return { collection, schematic };
  }

  list(collectionName: string) {
    const engineHost = new NodeModulesEngineHost();
    const engine = new SchematicEngine(engineHost);
    const collection = engine.createCollection(collectionName);
    return engine.listSchematicNames(collection);
  }

  async run(options: {
    collectionName: string;
    schematicName: string;
    debug?: boolean;
    dryRun?: boolean;
    force?: boolean;
    allowPrivate?: boolean;
    argv?: string[];
    options?: {};
  }) {
    const {
      collectionName,
      schematicName,
      debug,
      dryRun,
      force,
      allowPrivate,
      argv = [],
      options: passedOptions = {},
    } = options;

    /** Create the DevKit Logger used through the CLI. */
    const logger = createConsoleLogger(true, process.stdout, process.stderr);

    /** Create a Virtual FS Host scoped to where the process is being run. **/
    const fsHost = new virtualFs.ScopedHost(
      new NodeJsSyncHost(),
      normalize(process.cwd())
    );

    /** Create the workflow that will be executed with this run. */
    const workflow = new NodeWorkflow(fsHost, { force, dryRun });

    // Indicate to the user when nothing has been done. This is automatically set to off when there's
    // a new DryRunEvent.
    let nothingDone = true;

    // Logging queue that receives all the messages to show the users. This only get shown when no
    // errors happened.
    let loggingQueue: string[] = [];
    let error = false;

    /**
     * Logs out dry run events.
     *
     * All events will always be executed here, in order of discovery. That means that an error would
     * be shown along other events when it happens. Since errors in workflows will stop the Observable
     * from completing successfully, we record any events other than errors, then on completion we
     * show them.
     *
     * This is a simple way to only show errors when an error occur.
     */
    workflow.reporter.subscribe((event: DryRunEvent) => {
      nothingDone = false;

      switch (event.kind) {
        case 'error':
          error = true;

          const desc =
            event.description == 'alreadyExist'
              ? 'already exists'
              : 'does not exist';
          logger.warn(`ERROR! ${event.path} ${desc}.`);
          break;
        case 'update':
          loggingQueue.push(tags.oneLine`
          ${terminal.white('UPDATE')} ${event.path} (${
            event.content.length
          } bytes)
        `);
          break;
        case 'create':
          loggingQueue.push(tags.oneLine`
          ${terminal.green('CREATE')} ${event.path} (${
            event.content.length
          } bytes)
        `);
          break;
        case 'delete':
          loggingQueue.push(`${terminal.yellow('DELETE')} ${event.path}`);
          break;
        case 'rename':
          loggingQueue.push(
            `${terminal.blue('RENAME')} ${event.path} => ${event.to}`
          );
          break;
      }
    });

    /**
     * Listen to lifecycle events of the workflow to flush the logs between each phases.
     */
    workflow.lifeCycle.subscribe((event) => {
      if (event.kind == 'workflow-end' || event.kind == 'post-tasks-start') {
        if (!error) {
          // Flush the log queue and clean the error state.
          loggingQueue.forEach((log) => logger.info(log));
        }

        loggingQueue = [];
        error = false;
      }
    });

    // Pass the rest of the arguments as the smart default "argv". Then delete it.
    workflow.registry.addSmartDefaultProvider('argv', (schema: JsonObject) => {
      if ('index' in schema) {
        return argv[Number(schema['index'])];
      } else {
        return argv;
      }
    });
    // delete parsedArgs._;

    // Add prompts.
    workflow.registry.usePromptProvider(this.createPromptProvider());

    /**
     *  Execute the workflow, which will report the dry run events, run the tasks, and complete
     *  after all is done.
     *
     *  The Observable returned will properly cancel the workflow if unsubscribed, error out if ANY
     *  step of the workflow failed (sink or task), with details included, and will only complete
     *  when everything is done.
     */
    try {
      await workflow
        .execute({
          collection: collectionName,
          schematic: schematicName,
          options: passedOptions,
          allowPrivate: allowPrivate,
          debug: debug,
          logger: logger,
        })
        .toPromise();

      if (nothingDone) {
        logger.info('Nothing to be done.');
      }

      return 0;
    } catch (err) {
      if (err instanceof UnsuccessfulWorkflowExecution) {
        // "See above" because we already printed the error.
        logger.fatal('The Schematic workflow failed. See above.');
      } else if (debug) {
        logger.fatal('An error occured:\n' + err.stack);
      } else {
        logger.fatal(err.stack || err.message);
      }

      return 1;
    }
  }

  private createPromptProvider(): schema.PromptProvider {
    return (definitions: Array<schema.PromptDefinition>) => {
      const questions = definitions.map((definition) => {
        const question: inquirer.Question = {
          type: 'input',
          name: definition.id,
          message: definition.message,
          default: definition.default as any,
        };

        const validator = definition.validator;
        if (validator) {
          question.validate = (input: string) => validator(input);
        }

        switch (definition.type) {
          case 'confirmation':
            return { ...question, type: 'confirm' };
          case 'list':
            return {
              ...question,
              type: !!definition.multiselect ? 'checkbox' : 'list',
              choices:
                definition.items &&
                definition.items.map((item) => {
                  if (typeof item == 'string') {
                    return item;
                  } else {
                    return {
                      name: item.label,
                      value: item.value,
                    };
                  }
                }),
            };
          default:
            return { ...question, type: definition.type };
        }
      });

      return inquirer.prompt(questions as any);
    };
  }
}
