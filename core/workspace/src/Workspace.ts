import { validateSchema } from '@garment/schema-validator';
import * as fs from 'fs-extra';
import * as objectHash from 'object-hash';
import * as Path from 'path';
import {
  Config,
  ProjectConfig,
  ResolvedTaskConfig,
  ResolvedTaskDefinition,
  TaskConfig,
  TaskDefinition
} from './Config';
import { NodePackage } from './NodePackage';
import { Project } from './Project';
import { ProjectRegistry } from './ProjectRegistry';

import normalizePath = require('normalize-path');

export class Workspace {
  static validateConfig(config: Config) {
    const error = validateSchema(
      require('../schemas/config.schema.json'),
      config,
      'configuration'
    );
    if (error) {
      throw error;
    }
  }

  static create(config: Config, options: { cwd?: string } = {}) {
    const { cwd = process.cwd() } = options;

    this.validateConfig(config);

    return new Workspace(cwd, config);
  }

  readonly projects = new ProjectRegistry();
  currentProject?: Project;

  private constructor(
    public readonly cwd: string,
    public readonly config: Config
  ) {
    this.processProjects();
  }

  get taskNames() {
    const taskNameSet = new Set<string>();
    for (const project of this.projects) {
      Object.keys(project.tasks).forEach(taskName => taskNameSet.add(taskName));
    }
    return Array.from(taskNameSet);
  }

  addProject(projectName: string, projectConfig: ProjectConfig) {
    const { path, extends: projectExtends, dependencies = [] } = projectConfig;
    const fullPath = normalizePath(this.resolvePath(path));
    const extendsSet = new Set(
      projectExtends
        ? Array.isArray(projectExtends)
          ? projectExtends
          : [projectExtends]
        : []
    );

    if (!fs.existsSync(fullPath)) {
      throw new Error(
        `Path "${path}" of project "${projectName}" doesn't exist`
      );
    }

    const tasks = getProjectsTasks(this.config, projectName);
    const project = new Project({
      name: projectName,
      path,
      fullPath,
      tasks: tasks,
      dependencies,
      extendsSet
    });

    const packageJsonPath = project.resolvePath('./package.json');
    const packageJson = fs.readJsonSync(packageJsonPath, { throws: false });
    if (packageJson) {
      project.nodePackage = new NodePackage(packageJson);
    }

    this.projects.add(projectName, project);
  }

  resolvePath(...path: string[]) {
    return Path.resolve(this.cwd, ...path);
  }

  relative(path: string) {
    return Path.relative(this.cwd, path);
  }

  private processProjects() {
    const pathToNameMap = new Map<string, string>();
    for (const [projectName, projectConfig] of Object.entries(
      this.config.projects
    )) {
      const existingWithPath = pathToNameMap.get(projectConfig.path);
      if (existingWithPath) {
        throw new Error(
          `Can't define two projects with a same path "${projectConfig.path}". Used in "${existingWithPath}" and "${projectName}" projects`
        );
      }

      this.addProject(projectName, projectConfig);

      pathToNameMap.set(projectConfig.path, projectName);
    }
  }
}

export function getProjectsTasks(config: Config, projectName: string) {
  const { projects, presets = {} } = config;
  const resultTasks: { [name: string]: ResolvedTaskConfig } = {};

  function resolveTaskConfig(
    initialTaskConfig: TaskConfig,
    currentProjectName: string,
    currentIdAccumulator: string = ''
  ): ResolvedTaskConfig {
    const [projectName, taskConfig] =
      typeof initialTaskConfig === 'string'
        ? resolveTaskById(initialTaskConfig, currentProjectName)
        : [currentProjectName, initialTaskConfig];
    if (typeof taskConfig === 'string') {
      throw new Error(
        `Target task "${initialTaskConfig}" is referencing "${taskConfig}". Use reference "${taskConfig}" instead`
      );
    }
    if (Array.isArray(taskConfig)) {
      return {
        parallel: taskConfig.map(config => {
          const resolved = resolveTaskConfig(
            config,
            projectName,
            currentIdAccumulator
          );
          if (Array.isArray(resolved)) {
            return {
              parallel: resolved
            } as ResolvedTaskDefinition;
          } else {
            return resolved;
          }
        })
      } as ResolvedTaskDefinition;
    } else if (taskConfig.ref) {
      return {
        parallel: resolveTaskConfig(
          taskConfig.ref,
          projectName,
          currentIdAccumulator
        ),
        next:
          taskConfig.next &&
          resolveTaskConfig(
            taskConfig.next,
            projectName,
            currentIdAccumulator + '>'
          )
      } as ResolvedTaskDefinition;
    } else if (taskConfig.next) {
      return {
        ...taskConfig,
        next: resolveTaskConfig(
          taskConfig.next,
          projectName,
          currentIdAccumulator + '>'
        )
      } as ResolvedTaskDefinition;
    }
    return {
      ...taskConfig,
      id: currentIdAccumulator + objectHash(taskConfig)
    } as ResolvedTaskDefinition;
  }

  function resolveTaskById(
    taskId: string,
    currentProjectName: string
  ): readonly [string, TaskDefinition] {
    const [maybeProjectName, taskName] = taskId.split(':');
    const projectName = maybeProjectName || currentProjectName;
    const parentProject = presets[projectName] || projects[projectName];
    if (!parentProject) {
      throw new Error(`There is no project or preset called "${projectName}"`);
    }
    const taskConfig = (parentProject.tasks || {})[taskName];
    if (!taskConfig) {
      throw new Error(
        `Project or preset "${projectName}" doesn't have a task called "${taskName}"`
      );
    }
    if (typeof taskConfig === 'string') {
      return resolveTaskById(taskConfig, projectName);
    }

    return [projectName, taskConfig as any];
  }

  function traverseParents(projectNamesRaw: string | string[]) {
    const projectNames = Array.isArray(projectNamesRaw)
      ? projectNamesRaw
      : [projectNamesRaw];

    projectNames.forEach(name => {
      const parentProject = presets[name] || projects[name];
      if (!parentProject) {
        throw new Error(`There is no project or preset called "${name}"`);
      } else if (presets[name] && projects[name]) {
        throw new Error(
          `Project and preset can't have the same name "${name}"`
        );
      }

      if (parentProject.extends) {
        traverseParents(parentProject.extends);
      }

      if (parentProject.tasks) {
        for (const [taskName, taskConfig] of Object.entries(
          parentProject.tasks
        )) {
          if (taskConfig === false) {
            delete resultTasks[taskName];
          } else {
            const config = resolveTaskConfig(taskConfig, name);
            resultTasks[taskName] = config;
          }
        }
      }
    });
  }

  traverseParents(projectName);

  return resultTasks;
}
