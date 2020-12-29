/// <reference path="./types/parcel-watcher.d.ts" />

import { Graph } from '@garment/dependency-graph';
import { Level, Logger } from '@garment/logger';
import {
  CacheProvider,
  File,
  file,
  getHandler,
  getRunnerContext,
  getSchema,
  getWatcher,
  InputFn,
  InputFnCallBack,
  OutputContainer,
  renderOptions,
  RunnerMeta,
  validateOptions
} from '@garment/runner';
import {
  Action,
  ActionGraphTask,
  getActionGraph,
  Input,
  onUpdateEvent,
  Scheduler
} from '@garment/scheduler';
import { Config, Project, Workspace } from '@garment/workspace';
import * as parcelWatcher from '@parcel/watcher';
import { createHash } from 'crypto';
import * as fs from 'fs';
import { Volume } from 'memfs';
import * as multimatch from 'multimatch';
import * as Path from 'path';
import * as tempy from 'tempy';
import { ufs } from 'unionfs';
import { dependencyGraphFromWorkspace } from './dependencyGraphFromWorkspace';
import { FileCache } from './FileCache';
import { getProjectsByName } from './getProjectsByName';
import globby = require('globby');
import normalizePath = require('normalize-path');
import { isSubPath } from '@garment/utils';

export type Cache =
  | {
      type: 'file';
      cacheDir: string;
    }
  | { type: 'custom'; provider: string }
  | { type: 'remote' }
  | { type: 'off' };

export interface GarmentCommonOptions {
  runnerOptions: any; // Options coming to runners via CLI flags
  cache: Cache;
  onUpdate?: (event: onUpdateEvent) => void;
  skipLifecycle?: boolean;
}

export interface LogEntry {
  level: Level;
  content: any[];
  scope: string;
}

export interface CacheEntry {
  logs: LogEntry[];
  output: File[];
}

export type MetaInputHandler =
  | { type: 'single'; fn: InputFnCallBack }
  | { type: 'multi'; fn: InputFnCallBack<File[]> };

/**
 * Definitions of subscriptions
 * 
 * Imagine the following runner:
 * export default defineRunner(async ctx => {
    ctx.dependsOnFile('/some/path'); <=== This is runner level subscriptions

    await ctx.input(async file => { <=== If "file" is changed - rerun the input(file) 
      const content = file.data.toString('utf8');

      const outputContainer = ctx.createOutputContainer(
        [content], <=== cache keys for the current file
        ['file/dependency/path.js'] <=== Input level subscription, if changed, we rerun the input() handler for the "file"
      );
 * */

type SubscriptionLevel = 'runner' | 'input';
type SubscriptionInput = {
  rootDir: string;
  include?: string[];
  ignore?: string[];
  virtual?: boolean;
};
type Subscription =
  | {
      type: 'glob';
      input: SubscriptionInput;
      level: SubscriptionLevel;
    }
  | {
      type: 'file';
      baseDir: string;
      path: string;
      targetPath: string;
      level: SubscriptionLevel;
      forced?: boolean;
    };

async function garment(
  options: {
    task: {
      name: string;
      projectNames: string[];
      watch?: boolean;
    };
    cwd?: string;
    config: Config;
    files?: boolean;
  } & GarmentCommonOptions
) {
  const { task, files, cwd, config, ...rest } = options;

  const workspace = Workspace.create(config, { cwd });

  const transformedTask = {
    name: task.name,
    projects: getProjectsByName(workspace, task.projectNames, files),
    watch: task.watch
  };

  return garmentFromWorkspace({ ...rest, task: transformedTask, workspace });
}

async function garmentFromWorkspace(
  options: {
    task: ActionGraphTask;
    workspace: Workspace;
    dependencyGraph?: Graph<Project>;
  } & GarmentCommonOptions
) {
  const {
    task,
    onUpdate = () => {},
    workspace,
    skipLifecycle,
    runnerOptions,
    cache
  } = options;

  const { experimentalCacheSubscriptions } = workspace.config;

  const { dependencyGraph = dependencyGraphFromWorkspace(workspace) } = options;

  /**
   * Generating action graph
   * It's generated only once and then used in both first run and subsequent runs on change events
   */
  const actionGraph = getActionGraph({
    workspace,
    dependencyGraph,
    task,
    runnerOptions,
    lifecycle: !Boolean(skipLifecycle)
  });

  // cacheProvider implementing CacheProvider interface. Later we'll make it work with a remote cache as well
  const cacheProvider =
    cache.type === 'file'
      ? new FileCache<CacheEntry>(workspace.resolvePath(cache.cacheDir))
      : cache.type === 'custom'
      ? new (require(workspace.resolvePath(
          cache.provider
        )) as new () => CacheProvider<CacheEntry>)()
      : {
          has: () => false,
          get: () => {},
          set: () => {}
        };

  // The map to store changes related to each subscription
  let changesBySubscriptionMap = new Map<
    Subscription,
    { [path: string]: string }
  >();

  const getSnapshotId = (hash: string) => `action-${hash}`;

  // The map to store an information related to each action, so it can be reused between action executions
  const metaByAction = new Map<
    Action,
    {
      isWatchActive: boolean;
      subscriptions: Set<Subscription>;
      logs: LogEntry[];
      inputHandler?: MetaInputHandler;
      onDestroyHandler?: () => void;
      outputPath?: string;
    }
  >();

  let allSubscriptionsCached: Subscription[] = [];

  // Collecting batch actions during graph execution
  let batchActions: Action[] = [];

  let watcherStarted = false;

  // Creating virtual in-memory file system volume in order
  // It serves two purposes:
  // - Be able to output all the resulting files at the end of a full graph execution, so we don't overwhelm possible watchers
  // - Store intermediate result if we have a runners chain where first runner doesn't output files to the disk and passes them directly to next runner
  const memFsVolume = new Volume();
  memFsVolume.mkdirSync(workspace.cwd, { recursive: true });
  // Using UnionFS we join in-memory and physical fs
  const runnerFs = ufs.use(fs).use(memFsVolume as any);

  let skipFlushFileSet = new Set<string>();

  /**
   * The purpose of scheduler is to decide how and in which order execute rebuilder() against each action
   * The rebuilder then decides if it needs to run the whole action or only input() handler inside the runner
   */
  const scheduler = new Scheduler({
    async rebuilder(action, currentActionGraph) {
      const {
        hash,
        input,
        project,
        workspace,
        options,
        output: outputPath,
        outputMode = 'after-each',
        runner,
        pipe,
        watch
      } = action;

      let subscriptionsSnapshot: Subscription[] | undefined;

      if (experimentalCacheSubscriptions && !watcherStarted) {
        const actionSnaphotId = getSnapshotId(action.hash);
        if (await cacheProvider.has(actionSnaphotId)) {
          const cacheEntry = await cacheProvider.get(actionSnaphotId);

          if (cacheEntry && cacheEntry.output.length) {
            const savedSubscriptions = cacheEntry.output[0]
              .data as Subscription[];
            const result = [] as Subscription[];
            for (const subscriptionWithHash of savedSubscriptions) {
              const changes = {} as Record<string, string>;

              const {
                hash = {},
                ...subscription
              } = subscriptionWithHash as Subscription & {
                hash: Record<string, string>;
              }; //

              if (subscription.type === 'file' && subscription.forced) {
                changes[subscription.targetPath] = 'change';
              } else {
                const newHash = getHashForSubscriptions(subscription)!;

                if (newHash) {
                  for (const [fileName, fileHash] of Object.entries(hash)) {
                    if (newHash[fileName]) {
                      if (newHash[fileName] !== fileHash) {
                        changes[
                          subscription.type === 'glob'
                            ? fileName
                            : subscription.targetPath
                        ] = 'change';
                      }
                      delete newHash[fileName];
                    }
                  }

                  for (const fileName of Object.keys(newHash)) {
                    changes[
                      subscription.type === 'glob'
                        ? fileName
                        : subscription.targetPath
                    ] = 'change';
                  }
                } else {
                  changes[
                    subscription.type === 'glob'
                      ? 'deleted'
                      : subscription.targetPath
                  ] = 'delete';
                }
              }

              if (Object.keys(changes).length) {
                changesBySubscriptionMap.set(subscription, changes);
              }

              result.push(subscription);
            }
            subscriptionsSnapshot = result;
          }
        }
      }

      // if meta for the current action doesn't exist - create one
      let meta = metaByAction.get(action);
      if (!meta) {
        meta = {
          isWatchActive: watch,
          subscriptions: new Set(subscriptionsSnapshot ?? []),
          logs: []
        };
        metaByAction.set(action, meta);
      }

      const { subscriptions, logs, inputHandler } = meta;

      const logger = new Logger('', project.name, 'silly');
      logger.interceptors.push(({ level, args }) => {
        logs.push({
          level,
          content: args,
          scope: runner.queryName || runner.name
        });
        return false; // creating logger instance which doesn't output to the console
      });

      // Clear previous logs
      logs.length = 0;
      const collectedOutput: (File | OutputContainer)[] = [];

      let noChangesFound = true;
      let joinedChangesInput: File[] = [];

      // If runner has active subscriptions
      if (subscriptions.size) {
        // Split them in two categories, runner level and input level
        // Cause if there are changes available for the runner level subscription,
        // we restart the whole action and dont need to check input level subscriptions
        let [runnerLevelSubscriptions, inputLevelSubscriptions] = splitArrayBy(
          Array.from(subscriptions),
          subscription => subscription.level === 'runner'
        );

        // First iterate through all runner level subscriptions
        for (const subscription of runnerLevelSubscriptions) {
          const changes = changesBySubscriptionMap.get(subscription);

          if (changes) {
            // If we found a change, clear all the subscriptions, and clear input level ones so we go straight to the runner execution
            noChangesFound = false;
            subscriptions.clear();
            inputLevelSubscriptions = [];
            break;
          }
        }

        // If there was no runner level subs and there are input level subs
        if (inputLevelSubscriptions.length) {
          joinedChangesInput = [];

          const filePathsInInputSet = new Set<string>();

          // We interate over all input level subs in order to create a joined input for all files affected and feed it to the input() handler
          // Some of the changed can affect more then one subscription and we don't want to send the affected file to the input() twice
          // That's why we keep track of them in filePathsInInputSet
          for (const subscription of inputLevelSubscriptions) {
            const changes = changesBySubscriptionMap.get(subscription);

            changesBySubscriptionMap.delete(subscription);

            if (changes) {
              // Input level subscriptions are divided in two types: file and glob
              // The glob subscription is created for the input by default, cause the origin of input is always a glob pattern in the garment.json
              // And that subscriptions is always in place, that's why we don't remove it
              // File type is for subscriptions created for and individual file using OutputContainer
              // It serves situations when let's say "index.ts" depends on "foo.ts" and when "foo.ts" is changed we want to rebuild "index.ts"
              // in order to see if it was affected
              // File type subscriptions are removed after input() execution because file can stop have dependecy, if let's say we remove "foo.ts" dep from "index.ts"
              const rootDir =
                subscription.type === 'glob'
                  ? subscription.input.rootDir
                  : subscription.baseDir;

              const files = Object.keys(changes)
                .map(changedFilePath =>
                  subscription.type === 'glob'
                    ? changedFilePath
                    : subscription.targetPath
                )
                .filter(filePath => !filePathsInInputSet.has(filePath));

              if (files.length) {
                for (const file of files) {
                  filePathsInInputSet.add(file);
                }
                const fileInput = createFileInput(
                  { rootDir, files },
                  runnerFs as any // Using united FS here cause the file in subscriptions could be either in in-memory fs or in the real one
                );
                joinedChangesInput.push(...fileInput);
              }
            }
          }

          // Glob are created once and stay until garment's exit
          // File subscriptions can be changed after each runner or input() execution
          // That's why we remove them after getting changed files
          for (const subscription of inputLevelSubscriptions) {
            if (
              subscription.type === 'file' &&
              filePathsInInputSet.has(subscription.targetPath)
            ) {
              subscriptions.delete(subscription);
            }
          }

          if (joinedChangesInput.length) {
            noChangesFound = false;

            // If we have stored an input() handler from previous run
            if (inputHandler) {
              onUpdate({
                type: 'before-action',
                action
              });

              try {
                // Execute input() for each of the affected files and collect output
                const outputs = await executeInputHandler(
                  inputHandler,
                  joinedChangesInput
                );
                for (const output of outputs) {
                  if (output) {
                    if (OutputContainer.isOutputContainer(output)) {
                      for (const dependency of output.dependencies) {
                        // Update file's subscriptions
                        subscriptions.add({
                          type: 'file',
                          level: 'input',
                          path: dependency,
                          baseDir: output.targetBaseDir,
                          targetPath: output.target
                        });
                      }
                    }
                    collectedOutput.push(output);
                  }
                }
              } catch (err) {
                logger.error(err.stack ?? err);
              }

              await processOutput(collectedOutput);

              onUpdate({
                type: 'action-done',
                action,
                result: { logs, output: undefined, error: undefined }
              });

              return; // Stop rebuilder so it doesn't fallback to the full restart
            }
          }
        }
      }

      if ((watcherStarted || subscriptionsSnapshot) && noChangesFound) {
        onUpdate({
          type: 'action-skip',
          action
        });
        return; // We are in a watch mode and there's no changes -> skip runner execution
      }

      // Below is the code for executing the whole runner

      onUpdate({
        type: 'before-action',
        action
      });

      try {
        validateOptions(runner, options);

        // If the runner is batch we don't execute it now and just collect all the batch actions to execute them after the graph
        if (runner.batch) {
          batchActions.push(action);
        } else {
          // Temp directory is created for runners which for some reason have to output files directly to the FS.
          // This way we can then read them from that temp dir and transfrom as if runner used ctx.file or OutputContainer
          const tempOutputDir =
            outputPath ||
            currentActionGraph.getDirectDependantsOf(action).length > 0
              ? tempy.directory()
              : undefined;

          const inputs: SubscriptionInput[] = [];
          let joinedInput: File[] = [];
          if (joinedChangesInput.length) {
            joinedInput = joinedChangesInput;
          } else {
            if (input) {
              // If a runner options had "input" option
              inputs.push(input);
              joinedInput = [...createFileInput(input)];
            } else {
              // Or if a runner expects previous action's output to be passed as an input
              // Collecting all the previous action's outputs from the same project
              const sameProjectActionsDependenciesOutputPaths = getSameProjectDirectDependenciesMeta()
                .map(meta => meta.outputPath!)
                .filter(Boolean);

              const internalInputs = sameProjectActionsDependenciesOutputPaths.map(
                path => ({
                  rootDir: path,
                  include: [pipe],
                  virtual: true
                })
              );
              inputs.push(...internalInputs);

              // We expect that the output of previous actions is in the in-memory volume
              // because it's not necessary that it's gonna be written on the disk
              // so we're reading outputs from memFsVolume and creating an input for the current action
              if (sameProjectActionsDependenciesOutputPaths.length) {
                const memFsFiles = Object.keys(memFsVolume.toJSON());

                for (const path of sameProjectActionsDependenciesOutputPaths) {
                  const matchedFiles = multimatch(
                    memFsFiles,
                    Path.join(path, pipe)
                  );
                  const files = [
                    ...createFileInput(
                      { rootDir: path, files: matchedFiles },
                      memFsVolume as any
                    )
                  ];
                  joinedInput.push(...files);
                }
              }
            }
          }

          let shouldWatchDependencies = false;
          let isLongRunning = false;
          let onDestroyHandler: (() => void) | undefined;
          let inputFnCallback: MetaInputHandler | undefined;
          let isInputAlreadyCalled = false;

          const inputFn = ((fn: InputFnCallBack<File[]>) => {
            if (isInputAlreadyCalled) {
              throw new Error(
                `context.input() can only be called once during the runner's execution`
              );
            }
            inputFnCallback = {
              type: 'multi',
              fn
            };
            isInputAlreadyCalled = true;
          }) as InputFn;

          inputFn.forEach = fn => {
            if (isInputAlreadyCalled) {
              throw new Error(
                `context.input() can only be called once during the runner's execution`
              );
            }
            inputFnCallback = {
              type: 'single',
              fn
            };
            isInputAlreadyCalled = true;
          };

          const context = getRunnerContext({
            workspace,
            project,
            options: renderOptions({
              options,
              workspace,
              project,
              schema: getSchema(runner)
            }),
            outputDir: tempOutputDir,
            cacheProvider,
            defaultCacheKeys: [runner.name, runner.version],
            input: inputFn,
            fs: runnerFs as any,
            dependsOnFile(...paths) {
              // The way for a runner to specify runner-level dependencies explicitly
              for (const path of paths) {
                subscriptions.add({
                  type: 'file',
                  level: 'runner',
                  path,
                  baseDir: Path.dirname(path),
                  targetPath: path
                });
              }
            },
            watchDependencies() {
              shouldWatchDependencies = true;
            },
            longRunning(onDestroy) {
              onDestroyHandler = onDestroy;
              isLongRunning = true;
            },
            async commitFilesToFS() {
              flushMemFs();
            },
            logger
          });

          const handler = getHandler(runner);

          const handlerOutputs = arrayfy(await handler(context));

          if (inputFnCallback) {
            // If the callback was passed then we add input-level subscription for a glob pattern and
            // we don't need to restart the runner, only input() for a changed file
            if (meta) {
              meta.inputHandler = inputFnCallback;
            }
            for (const input of inputs) {
              subscriptions.add({
                type: 'glob',
                level: 'input',
                input
              });
            }

            try {
              // Run .input() for each file, read output's dependencies and add input-level subscription for each one
              const outputs = await executeInputHandler(
                inputFnCallback,
                joinedInput
              );
              if (outputs) {
                for (const output of outputs) {
                  if (OutputContainer.isOutputContainer(output)) {
                    for (const dependency of output.dependencies) {
                      subscriptions.add({
                        type: 'file',
                        level: 'input',
                        path: dependency,
                        baseDir: output.targetBaseDir,
                        targetPath: output.target
                      });
                    }
                  }
                  collectedOutput.push(output);
                }
              }
            } catch (err) {
              logger.error(err.stack ?? err);
            }
          }

          // If a runner returned output, process it almost like in .input() case but
          // all the files' dependencies are added as runner-level subscriptions
          for (const output of handlerOutputs) {
            if (output) {
              if (OutputContainer.isOutputContainer(output)) {
                for (const dependency of output.dependencies) {
                  subscriptions.add({
                    type: 'file',
                    level: output.target ? 'input' : 'runner',
                    path: dependency,
                    baseDir: output.targetBaseDir,
                    targetPath: output.target ?? dependency
                  });
                }
              }
              collectedOutput.push(output);
            }
          }

          // If a runner marked is longRunning and provided onDestroyHandler
          // we save it's onDestroyHandler
          // the current logic is that if there's a chain of runners, and first one is long running
          // and the second is not, after executing the second one, we call the destroy handler
          // of all previous long running in that chain for the same project
          if (isLongRunning) {
            meta.onDestroyHandler = onDestroyHandler;
          } else {
            for (const meta of getSameProjectDirectDependenciesMeta()) {
              meta.onDestroyHandler?.();
              meta.onDestroyHandler = undefined;
            }
          }

          if (shouldWatchDependencies) {
            // Set all dependencies' subscriptions to active
            const dependencyMetas = currentActionGraph
              .getDependenciesOf(action)
              .map(depAction => metaByAction.get(depAction)!);
            for (const dependencyActionMeta of dependencyMetas) {
              dependencyActionMeta.isWatchActive = true;
            }
          }

          // If there was not direct returns from the runner handler or input handler
          // we assume that runner could output files to the provided temp dir, so we try to take files from there
          if (!collectedOutput.length && tempOutputDir) {
            collectedOutput.push(
              ...createFileInput({
                rootDir: tempOutputDir,
                include: ['**/*']
              })
            );
          }

          await processOutput(collectedOutput);
        }
      } catch (err) {
        logger.error(err.stack ?? err);
      }

      onUpdate({
        type: 'action-done',
        action,
        result: { logs, output: undefined, error: undefined }
      });

      if (logs.some(log => log.level === 'error')) {
        throw new Error('log has error');
      }

      async function executeInputHandler(
        handler: MetaInputHandler,
        files: File[]
      ) {
        if (handler.type === 'single') {
          const results: (File | OutputContainer)[] = [];
          for (const file of files) {
            const outputs = await handler.fn(file);
            if (outputs) {
              results.push(...arrayfy(outputs));
            }
          }
          return results;
        } else {
          const outputs = await handler.fn(files);
          return outputs ? arrayfy(outputs) : [];
        }
      }

      async function processOutput(fileOutput: typeof collectedOutput) {
        const filesToWrite: File[] = [];

        for (const outputItem of fileOutput) {
          if (OutputContainer.isOutputContainer(outputItem)) {
            await outputItem.syncWithCache();

            filesToWrite.push(...outputItem.files);
            logs.push(...outputItem.logs);

            if (outputItem.hasErrorsOrWarnings()) {
              subscriptions.add({
                type: 'file',
                level: 'input',
                path: outputItem.target,
                targetPath: outputItem.target,
                baseDir: outputItem.targetBaseDir,
                forced: true
              });
            }
          } else {
            filesToWrite.push(outputItem);
          }
        }

        const outputPaths = outputPath ? [...arrayfy(outputPath)] : [];
        if (
          currentActionGraph.getDirectDependantsOf(action).length &&
          !outputPaths.length &&
          filesToWrite.length
        ) {
          // if there was no "output" option provided but the action is in the chain and has a next action
          // and the current action has output, we create a temporary path for output to the memfs
          outputPaths.push(actionToOutputPath(action));
        }
        if (meta && outputPaths.length) {
          meta.outputPath = outputPaths[0]; // Next actions can use this output path to create an input
        }

        // For all the files we're about to output, we create a changes object in a format of parcel watcher event
        // because some of the actions ahead can be subscribed to the changes of one of the files in output of the current action
        // and we want to notify them that there are changes
        const events: parcelWatcher.Event[] = [];

        for (const outputPath of outputPaths) {
          for (const file of filesToWrite) {
            if (!file.skipWrite) {
              const content =
                file.type === 'json' ? JSON.stringify(file.data) : file.data;
              const filePath = Path.resolve(outputPath, file.path);
              const fileDir = Path.dirname(filePath);

              if (experimentalCacheSubscriptions) {
                subscriptions.add({
                  type: 'file',
                  level: 'runner',
                  baseDir: outputPath,
                  path: filePath,
                  targetPath: ''
                });
              }

              const fsToUse =
                outputPath && outputPath.length && outputMode === 'after-each'
                  ? fs
                  : memFsVolume;
              if (!fsToUse.existsSync(fileDir)) {
                fsToUse.mkdirSync(fileDir, { recursive: true });
              }
              fsToUse.writeFileSync(filePath, content);

              if (
                outputMode === 'in-memory' ||
                !(outputPath && outputPath.length) ||
                fsToUse === fs
              ) {
                skipFlushFileSet.add(filePath);
              }

              events.push({ path: filePath, type: 'update' });
            }
          }
        }

        if (experimentalCacheSubscriptions) {
          // Cache action subscriptions
          if (subscriptions.size) {
            const hashedSubscriptions = Array.from(subscriptions).map(
              subscription => ({
                ...subscription,
                hash: getHashForSubscriptions(subscription)
              })
            );
            await cacheProvider.set(getSnapshotId(action.hash), {
              output: [file.json('subscriptions', hashedSubscriptions)],
              logs: []
            });
          }
        }

        mapChangesToSubscriptions(events);
      }

      function getSameProjectDirectDependenciesMeta() {
        return currentActionGraph
          .getDirectDependenciesOf(action)
          .filter(
            dependencyAction => dependencyAction.project === action.project
          )
          .map(action => metaByAction.get(action)!)
          .filter(Boolean);
      }
    }
  });

  await executeActionGraph();

  const [batchActionsToWatch, batchActionsToExecute] = splitArrayBy(
    batchActions,
    _ => _.watch
  );

  if (batchActionsToExecute.length) {
    await runActionsInBatch(batchActionsToExecute, {
      runnerOptions
    });
  }

  populateAllSubscriptions();

  if ([...metaByAction.values()].some(_ => _.isWatchActive)) {
    watcherStarted = true;

    await startWatcher();

    console.log('Started watching...');
  }

  if (batchActionsToWatch.length) {
    await runActionsInBatch(batchActionsToWatch, {
      watch: true,
      runnerOptions
    });
  } else {
    if (!watcherStarted) {
      for (const meta of metaByAction.values()) {
        meta?.onDestroyHandler?.();
      }
    }
  }

  async function startWatcher() {
    const watcher = await parcelWatcher.subscribe(
      workspace.cwd,
      async (err, events) => {
        if (err) {
          throw err;
        }

        mapChangesToSubscriptions(events);

        if (changesBySubscriptionMap.size) {
          await watcher.unsubscribe();

          console.log(`Retriggering build...`);
          await executeActionGraph();
          allSubscriptionsCached = [];

          await startWatcher();
        }
      },
      { ignore: ['.git', 'node_modules'].map(_ => Path.join(workspace.cwd, _)) }
    );
  }

  async function executeActionGraph() {
    try {
      onUpdate({
        type: 'all-actions',
        actions: [...actionGraph]
      });
      batchActions = [];
      await scheduler.execute(actionGraph);
      flushMemFs();
      changesBySubscriptionMap.clear();

      console.log('');
      onUpdate({ type: 'reset' });
    } catch (error) {
      onUpdate({ type: 'done', graph: actionGraph });
    }
  }

  function mapChangesToSubscriptions(events: parcelWatcher.Event[]) {
    if (!allSubscriptionsCached.length) {
      populateAllSubscriptions();
    }
    for (const subscription of allSubscriptionsCached) {
      for (const event of events) {
        if (event.type === 'delete') {
          continue;
        }

        const changesBySubscription =
          changesBySubscriptionMap.get(subscription) ?? {};

        if (
          subscription.type === 'glob' &&
          isSubPath(subscription.input.rootDir, normalizePath(event.path))
        ) {
          const matched = multimatch(
            event.path,
            (subscription.input.include ?? []).map(pattern =>
              Path.join(subscription.input.rootDir, pattern)
            )
          );
          if (matched.length) {
            changesBySubscription[normalizePath(event.path)] = event.type;
            changesBySubscriptionMap.set(subscription, changesBySubscription);
          }
        } else if (
          subscription.type === 'file' &&
          subscription.path === event.path
        ) {
          changesBySubscription[subscription.targetPath] = event.type;
          changesBySubscriptionMap.set(subscription, changesBySubscription);
        }
      }

      if (subscription.type === 'file' && subscription.forced) {
        changesBySubscriptionMap.set(subscription, {
          [subscription.targetPath]: 'change'
        });
      }
    }
  }

  function populateAllSubscriptions() {
    allSubscriptionsCached = [];
    for (const { subscriptions } of metaByAction.values()) {
      allSubscriptionsCached.push(...subscriptions);
    }
  }

  async function runActionsInBatch(
    actions: Action[],
    opts: {
      watch?: boolean;
      runnerOptions?: {
        [key: string]: { [key: string]: any };
      };
    } = {}
  ) {
    const { watch, runnerOptions = {} } = opts;
    const { global = {}, ...restRunners } = runnerOptions;

    const batchesByRunner = new Map<
      string,
      {
        runner: RunnerMeta;
        batch: { project: Project; options: any }[];
      }
    >();
    for (const action of actions) {
      if (!batchesByRunner.has(action.runner.handlerPath)) {
        batchesByRunner.set(action.runner.handlerPath, {
          runner: action.runner,
          batch: []
        });
      }
      const { batch } = batchesByRunner.get(action.runner.handlerPath)!;

      batch.push({
        project: action.project,
        options: renderOptions({
          options: action.options,
          workspace,
          project: action.project,
          schema: getSchema(action.runner)
        })
      });
    }
    for (const { runner, batch } of batchesByRunner.values()) {
      onUpdate({ type: 'before-batch', runner, batch });

      const options = {
        ...global,
        ...restRunners[runner.name]
      };

      const logs: LogEntry[] = [];

      const logger = new Logger('', 'batch', 'info');
      logger.interceptors.push(({ level, args }) => {
        logs.push({
          level,
          content: args,
          scope: runner.queryName || runner.name
        });
        return false;
      });

      const context = getRunnerContext({
        workspace,
        project: new Project({
          name: 'batch',
          path: '',
          fullPath: '',
          tasks: {},
          dependencies: [],
          extendsSet: new Set()
        }),
        options: options,
        input: ((async () => {
          return [[] as File[], () => {}] as const;
        }) as any) as InputFn,
        dependsOnFile() {},
        cacheProvider,
        batch,
        logger
      });

      const handler = watch ? getWatcher(runner) : getHandler(runner);
      const output = await handler(context);

      onUpdate({
        type: 'batch-done',
        runner,
        batch,
        result: { output, logs, error: null }
      });
    }
  }

  function flushMemFs() {
    for (const [filePath, content] of Object.entries(memFsVolume.toJSON())) {
      if (!content || skipFlushFileSet.has(filePath)) {
        continue;
      }
      const dirName = Path.dirname(filePath);
      if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName, { recursive: true });
      }
      fs.writeFileSync(filePath, content);
    }
    skipFlushFileSet.clear();
  }

  function getHashForSubscriptions(subscription: Subscription) {
    if (subscription.type === 'glob' && !subscription.input.virtual) {
      const files = Array.from(createFileInput(subscription.input)).sort();
      const hashByFile = {} as Record<string, string>;
      for (const file of files) {
        hashByFile[file.absolutePath!] = createHash('md5')
          .update(file.data)
          .digest('hex');
      }
      return hashByFile;
    } else if (
      subscription.type === 'file' &&
      fs.existsSync(subscription.path)
    ) {
      const hash = subscription.forced
        ? ''
        : createHash('md5')
            .update(fs.readFileSync(subscription.path))
            .digest('hex');
      return { [subscription.path]: hash };
    }
  }
}

export default garment;
export { garment, garmentFromWorkspace };

export function* createFileInput(
  { rootDir, files = [], include, exclude = [] }: Input,
  fsInstance = fs
) {
  const filesFromGlob =
    fsInstance === fs && include && fsInstance.existsSync(rootDir)
      ? globby.sync(include, {
          cwd: rootDir,
          absolute: true,
          ignore: exclude,
          dot: true
        })
      : [];

  const uniqueFiles = new Set([...files, ...filesFromGlob]);
  for (const absolutePath of uniqueFiles) {
    const content = fsInstance.readFileSync(absolutePath);
    const finalRootDir = rootDir ?? Path.dirname(absolutePath);
    const file: File = {
      type: 'binary',
      path: Path.relative(finalRootDir, absolutePath),
      absolutePath,
      baseDir: finalRootDir,
      data: content
    };
    yield file;
  }
}

function actionToOutputPath(action: Action) {
  return `/__garment/action_${action.id}/output`;
}

function arrayfy<T>(arr: T | T[] = []) {
  return Array.isArray(arr) ? arr : [arr];
}

function splitArrayBy<T>(arr: T[], fn: (item: T) => boolean | undefined) {
  const filtered: T[] = [];
  const others: T[] = [];
  for (const item of arr) {
    if (fn(item)) {
      filtered.push(item);
    } else {
      others.push(item);
    }
  }
  return [filtered, others];
}
