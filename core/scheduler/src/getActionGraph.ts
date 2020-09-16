import { Graph } from '@garment/dependency-graph';
import { getRunnerMeta, requireQuery, RunnerMeta } from '@garment/runner';
import {
  Project,
  ResolvedTaskConfig,
  RunnerTaskDefinition,
  WithId,
  Workspace
} from '@garment/workspace';
import * as multimatch from 'multimatch';
import * as objectHash from 'object-hash';
import * as Path from 'path';
import { Action, Input, RunnerAction } from './Action';

import globParent = require('glob-parent');

const getNextId = (id => () => id++)(0);

export interface ActionGraphTask {
  name: string;
  projects: (Project | { project: Project; files: string[] })[];
  watch?: boolean;
}

export interface GetActionGraphOptions {
  workspace: Workspace;
  dependencyGraph: Graph<Project>;
  task: ActionGraphTask;
  envName?: string;
  lifecycle?: boolean;
  cleanUnnecessaryDependencies?: boolean;
  runnerOptions?: {
    [key: string]: { [key: string]: any };
  };
}

export function getActionGraph(opts: GetActionGraphOptions) {
  const {
    workspace,
    dependencyGraph,
    task,
    lifecycle = true,
    runnerOptions = {}
  } = opts;
  /**
   * Map for cached runner executors
   */
  const runners = new Map<string, RunnerMeta>();

  const resultActionGraph = new Graph<Action>();

  const subGraphByConfigId = new Map<string, Graph<Action>>();

  const { name, projects, watch = false } = task;

  const { global = {}, ...restRunners } = runnerOptions;

  for (const projectItem of projects) {
    const [projectToProcess, files] =
      projectItem instanceof Project
        ? [projectItem, undefined]
        : [projectItem.project, projectItem.files];

    getActionGraphByTask(name, projectToProcess, watch);

    function getActionGraphByTask(
      task: string,
      project: Project,
      watch?: boolean
    ) {
      return filterFalsy(
        [lifecycle && `pre${task}`, task, lifecycle && `post${task}`]
          .map(
            taskName => [taskName, taskName && project.tasks[taskName]] as const
          )
          .map(([taskName, taskConfig]) => {
            if (taskName && taskConfig) {
              return getActionGraphFromTaskConfig(
                taskName,
                taskConfig,
                project,
                Boolean(watch)
              );
            } else {
              return new Graph<Action>();
            }
          })
      ).reduce((prevActionGraph, nextGraph) => {
        const actionGraph = prevActionGraph.clone();
        const dependants = nextGraph.getLeafNodes();
        const dependencies = actionGraph.getNodesWithoutDependants();
        actionGraph.assign(nextGraph);
        for (const dependant of dependants) {
          for (const dependency of dependencies) {
            actionGraph.addDependency(dependant, dependency);
            resultActionGraph.addDependency(dependant, dependency);
          }
        }
        return actionGraph;
      });
    }

    function getActionGraphFromTaskConfig(
      taskName: string,
      taskConfig: ResolvedTaskConfig,
      project: Project,
      watch: boolean
    ) {
      const actionGraph = addActionsFromConfigs(taskConfig);

      function addActionsFromConfigs(taskConfig: ResolvedTaskConfig) {
        function addActionFromConfig(config: WithId<RunnerTaskDefinition>) {
          const {
            id,
            runner,
            options = {},
            output,
            outputMode,
            skipWatch,
            input,
            pipe
          } = config;

          if (!runners.has(runner)) {
            runners.set(runner, getRunnerMeta(runner, workspace.cwd));
          }
          const runnerMeta = runners.get(runner)!;

          const normalizedOptions: any = {};

          Object.assign(
            normalizedOptions,
            options,
            taskName === name ? global : {},
            restRunners[runner]
          );

          let resolvedInput: Input | undefined;

          if (typeof input === 'string') {
            const resolvedInputPattern = project.resolvePathTemplate(input);
            const rootDir = globParent(resolvedInputPattern);
            const include = [
              resolvedInputPattern.replace(new RegExp(`^${rootDir}\/*`), '')
            ];
            if (files) {
              const matchedFiles = multimatch(files, [resolvedInputPattern]);
              if (matchedFiles.length) {
                resolvedInput = {
                  files: matchedFiles,
                  rootDir
                };
              } else {
                return;
              }
            } else {
              resolvedInput = {
                rootDir,
                include
              };
            }
            resolvedInput.rootDir = rootDir;
          } else if (typeof input === 'object') {
            let finalInput: Input;
            if (input.type === 'custom') {
              const providerPath =
                Path.isAbsolute(input.provider) || input.provider[0] === '.'
                  ? workspace.resolvePath(input.provider)
                  : input.provider;
              const providerFn = requireQuery<
                (project: Project, options: any) => Input
              >(providerPath);
              finalInput = providerFn(project, normalizedOptions);
            } else {
              const rootDir = project.resolvePathTemplate(
                input.rootDir || '{{projectDir}}'
              );
              const include = input.include || ['**/*'];
              const exclude = input.exclude;

              finalInput = {
                rootDir,
                include,
                exclude
              };
            }

            if (files) {
              const matchedFiles = multimatch(
                files.filter(file => file.startsWith(finalInput.rootDir)),
                [
                  ...(finalInput.files ?? []),
                  ...(finalInput.include ?? []),
                  ...(finalInput.exclude?.map(_ => `!${_}`) ?? [])
                ]
              );
              if (matchedFiles.length) {
                resolvedInput = {
                  files: matchedFiles,
                  rootDir: finalInput.rootDir
                };
              } else {
                return;
              }
            } else {
              resolvedInput = finalInput;
            }
          }

          const action: RunnerAction = {
            type: 'runner',
            id: getNextId(),
            hash: '',
            task: taskName,
            workspace,
            runner: runnerMeta,
            watch: skipWatch ? false : watch,
            lifecycle,
            project,
            options: normalizedOptions,
            output: output
              ? arrayfy(output).map(_ => project.resolvePathTemplate(_))
              : undefined,
            outputMode,
            input: resolvedInput,
            pipe: typeof pipe === 'string' ? pipe : '**/*'
          };
          action.hash = objectHash({
            runnerMeta,
            projectDir: project.fullPath,
            options: action.options,
            outputMode,
            input: action.input,
            pipe: action.pipe
          });

          return action;
        }

        const currentConfigActionGraph = new Graph<Action>();
        let taskConfigIdToCache: string | undefined;

        if (taskConfig.parallel) {
          for (const parallelItemConfig of arrayfy<ResolvedTaskConfig>(
            taskConfig.parallel
          )) {
            const actionsToAddGraph = addActionsFromConfigs(parallelItemConfig);
            currentConfigActionGraph.assign(actionsToAddGraph);
          }
        } else {
          if (subGraphByConfigId.has(project.name + taskConfig.id)) {
            const subGraph = subGraphByConfigId.get(
              project.name + taskConfig.id
            )!;
            return subGraph;
          }

          const addedAction = addActionFromConfig(taskConfig);
          if (addedAction) {
            const { id, buildDependencies } = taskConfig;
            taskConfigIdToCache = project.name + id;
            currentConfigActionGraph.addNode(addedAction);
            resultActionGraph.addNode(addedAction);

            const runnerProject = workspace.projects.getByPath(
              addedAction.runner.handlerPath
            );
            if (runnerProject && buildDependencies !== false) {
              // We need to first build the runner
              const runnerActionGraph = getActionGraphByTask(
                'build',
                runnerProject
              );
              for (const runnerActionGraphRoot of runnerActionGraph.getNodesWithoutDependants()) {
                resultActionGraph.addDependency(
                  addedAction,
                  runnerActionGraphRoot
                );
              }
            }

            if (buildDependencies) {
              let depTask = 'build';
              let depWatch = watch;
              let onlyDirectDeps = false;
              if (typeof buildDependencies === 'string') {
                depTask = buildDependencies;
              } else if (typeof buildDependencies === 'boolean') {
              } else {
                const {
                  task,
                  watch: watchOpt = watch,
                  onlyDirect = false
                } = buildDependencies;
                depTask = task;
                depWatch = watchOpt;
                onlyDirectDeps = onlyDirect;
              }
              const deps = onlyDirectDeps
                ? dependencyGraph.getDirectDependenciesOf(project)
                : dependencyGraph.getDependenciesOf(project);
              for (const dep of deps) {
                const depActionGraph = getActionGraphByTask(
                  depTask,
                  dep,
                  depWatch
                );
                for (const depActionGraphRoot of depActionGraph.getNodesWithoutDependants()) {
                  resultActionGraph.addDependency(
                    addedAction,
                    depActionGraphRoot
                  );
                }
              }
            }
          }
        }
        if (taskConfig.next) {
          const currentRoots = currentConfigActionGraph.getNodesWithoutDependants();
          for (const parallelItemConfig of arrayfy<ResolvedTaskConfig>(
            taskConfig.next
          )) {
            const nextActionsGraph = addActionsFromConfigs(parallelItemConfig);
            currentConfigActionGraph.assign(nextActionsGraph);
            resultActionGraph.assign(nextActionsGraph);
            for (const nextAction of nextActionsGraph.getLeafNodes()) {
              for (const addedAction of currentRoots) {
                resultActionGraph.addDependency(nextAction, addedAction);
                currentConfigActionGraph.addDependency(nextAction, addedAction);
              }
            }
          }
        }

        if (taskConfigIdToCache) {
          subGraphByConfigId.set(taskConfigIdToCache, currentConfigActionGraph);
        }

        return currentConfigActionGraph;
      }

      return actionGraph;
    }
  }

  return resultActionGraph;
}

export const filterFalsy = <T, K = Exclude<T, boolean | undefined | null>>(
  items: T[]
): K[] => items.filter(Boolean) as any;

function arrayfy<T>(arr: T | T[]) {
  return Array.isArray(arr) ? arr : [arr];
}
