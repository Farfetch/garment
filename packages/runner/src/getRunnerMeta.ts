import { OutputContainer } from './OutputContainer';
import { validateSchema } from '@garment/schema-validator';
import * as Path from 'path';
import { File } from './types';
import { Context } from './getRunnerContext';

export interface RunnerConfig {
  handler: string;
  description: string;
  watcher?: string;
  batch?: boolean;
  cacheKeys?: string;
}

export interface RunnersConfig {
  runners: {
    [name: string]: RunnerConfig;
  };
}

export function getRunnerMeta(runnerName: string, cwd: string) {
  if (Path.isAbsolute(runnerName) || runnerName[0] === '.') {
    return {
      name: runnerName,
      version: 'internal',
      handlerPath: Path.resolve(cwd, runnerName),
      description: 'no description',
      batch: false,
    };
  }

  const [packageName, scriptName = 'default'] = runnerName.split(':');

  const namesToTry = [`@garment/plugin-runner-${packageName}`, packageName];

  for (const resolvedPackageName of namesToTry) {
    try {
      // First check if package has runners.json file. In this case use it to get runners information
      const packageJsonPath = require.resolve(
        `${resolvedPackageName}/package.json`
      );

      const runnersPackageJson = require(packageJsonPath) as {
        main: string;
        version: string;
      };

      const packagePath = Path.dirname(packageJsonPath);
      const resolveFromPackage = (path: string) =>
        Path.resolve(packagePath, path);

      try {
        const runnersJson: RunnersConfig = require(resolveFromPackage(
          'runners.json'
        ));

        const error = validateSchema(
          require('../schemas/runners.schema.json'),
          runnersJson,
          runnerName + 'Schema'
        );
        if (error) {
          throw error;
        }

        const runnerConfig = runnersJson.runners[scriptName];
        if (!runnerConfig) {
          throw new Error(
            `Runner "${scriptName}" is not found in "${resolvedPackageName}"`
          );
        }

        return {
          name: runnerName,
          version: runnersPackageJson.version,
          handlerPath: resolveFromPackage(runnerConfig.handler),
          description: runnerConfig.description,
          watcherPath: runnerConfig.watcher
            ? resolveFromPackage(runnerConfig.watcher)
            : undefined,
          batch: runnerConfig.batch || false,
          cacheKeysPath: runnerConfig.cacheKeys
            ? resolveFromPackage(runnerConfig.cacheKeys)
            : undefined,
        };
      } catch (e) {
        if (e.code !== 'MODULE_NOT_FOUND') {
          throw e;
        }
      }

      // Then check if package resolves to the main file
      const runnerHandlerPath = runnersPackageJson.main;

      return {
        name: resolvedPackageName,
        queryName: packageName,
        version: runnersPackageJson.version,
        handlerPath: resolveFromPackage(runnerHandlerPath),
        description: 'no description',
        batch: false,
      };
    } catch (e) {
      if (e.code !== 'MODULE_NOT_FOUND') {
        throw e;
      }
    }
  }

  throw new Error(
    `Runner "${packageName}" not found. Tried: ${namesToTry.join(', ')}`
  );
}

export type RunnerMeta = NonNullable<ReturnType<typeof getRunnerMeta>>;

export interface RunnerHandler<O> {
  (context: Context<O>):
    | File
    | OutputContainer
    | File[]
    | OutputContainer[]
    | Promise<File>
    | Promise<File[]>
    | Promise<OutputContainer>
    | Promise<OutputContainer[]>
    | Promise<void>;
}

export interface RunnerCacheKeys<O> {
  (context: Context<O>): Promise<string[]> | string[];
}

export function getHandler(runnerMeta: RunnerMeta) {
  return requireQuery(runnerMeta.handlerPath).handler as RunnerHandler<any>;
}

export function getWatcher(runnerMeta: RunnerMeta) {
  if (runnerMeta.watcherPath) {
    return requireQuery(runnerMeta.watcherPath).handler as RunnerHandler<any>;
  } else {
    throw new Error(`Runner "${runnerMeta.name}" doesn't support watch mode`);
  }
}

export function getCacheKeys({ cacheKeysPath }: RunnerMeta) {
  return cacheKeysPath
    ? (requireQuery(cacheKeysPath).cacheKeysFn as RunnerCacheKeys<any>)
    : (arg: any) => [];
}

export function getSchema(runnerMeta: RunnerMeta) {
  return requireQuery(runnerMeta.handlerPath)?.options?.schema ?? {};
}

export function validateOptions(runnerMeta: RunnerMeta, options: any) {
  const { outputDir, ...restOptions } = filterOptions(options);
  const error = validateSchema(
    getSchema(runnerMeta),
    restOptions,
    runnerMeta.name + 'Options'
  );
  if (error) {
    throw error;
  }
}

export function requireQuery<T = any>(query: string): T {
  const [path, exportName] = query.split('#');
  const exports = require(path);
  return exportName ? exports[exportName] : exports.default || exports;
}

function filterOptions<T extends { [key in keyof T]: any }>(obj: T) {
  const result: { [key: string]: any } = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value) {
      result[key] = value;
    }
  }
  return result as T;
}
