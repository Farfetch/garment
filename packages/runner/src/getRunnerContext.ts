import { Logger } from '@garment/logger';
import { Project, Workspace } from '@garment/workspace';
import * as originalFs from 'fs';
import * as Mustache from 'mustache';
import { CacheProvider, OutputContainer } from './OutputContainer';
import { File, JsonFile, TextFile } from './types';
import * as Path from 'path';

(Mustache as any).escape = (text: string) => text;

export type GenericContext = ReturnType<typeof getRunnerContext>;
export type ContextOptions<O> = O & { outputDir?: string };

type GeneratorNextType<T> = T extends () => Generator<infer R, any, any>
  ? R
  : never;

export type Batch<O> = GeneratorNextType<GenericContext['batch']> & {
  options: ContextOptions<O>;
};

export type BatchGenerator<O> = () => Generator<Batch<O>>;

export interface Context<O> extends GenericContext {
  options: ContextOptions<O>;
  batch: BatchGenerator<O>;
}

export type InputFnCallbackReturn =
  | File
  | OutputContainer
  | File[]
  | OutputContainer[]
  | void;

export type InputFnCallBack<T = File> = (
  arg: T
) => InputFnCallbackReturn | Promise<InputFnCallbackReturn>;

export interface InputFn {
  (fn: InputFnCallBack<File[]>): void;
  forEach(fn: InputFnCallBack): void;
}

export interface GetRunnerContextOptions<O> {
  workspace: Workspace;
  project: Project;
  options: O;
  input: InputFn;
  fs?: typeof originalFs;
  dependsOnFile?(...paths: string[]): void;
  watchDependencies?(): void;
  longRunning?(onDestroy?: () => void): void;
  commitFilesToFS?(): Promise<void>;
  cacheProvider: CacheProvider;
  logger: Logger;
  defaultCacheKeys?: string[];
  batch?: { project: Project; options: O }[];
  outputDir?: string;
}

export function file(file: File) {
  return file;
}
file.text = (path: string, data: string, additional?: Partial<TextFile>) =>
  file({ type: 'text', path, data, ...additional }) as TextFile;
file.json = (path: string, data: object, additional?: Partial<JsonFile>) =>
  file({ type: 'json', path, data, ...additional }) as JsonFile;

export function renderTemplate(template: string, data: any) {
  return Mustache.render(template, data);
}

function emptyFn() {}
async function emptyAsyncFn() {}

export function renderOptions<O extends Record<string, any>>({
  options,
  project,
  workspace,
  schema
}: {
  options: O;
  project: Project;
  workspace: Workspace;
  schema: {
    properties?: {
      [prop: string]: {
        type?: string;
        format?: string;
        default?: string;
      };
    };
  };
}) {
  const templateData = {
    projectDir: project.fullPath,
    projectName: project.name
  };

  const schemaProperties = schema?.properties ?? {};

  const transformedOptions: Record<string, any> = {};
  Object.entries(schemaProperties).forEach(([propName, propDef]) => {
    const optionValue = options[propName] ?? propDef.default;
    transformedOptions[propName] =
      typeof optionValue === 'string' && propDef.format === 'path'
        ? (Path.resolve(
            workspace.cwd,
            renderTemplate(optionValue, templateData)
          ) as any)
        : optionValue;
  });
  return transformedOptions as O;
}

export function getRunnerContext<O extends Record<string, any>>(
  opts: GetRunnerContextOptions<O>
) {
  const {
    options,
    project,
    outputDir,
    workspace,
    input,
    fs = originalFs,
    dependsOnFile = emptyFn,
    watchDependencies = emptyFn,
    longRunning = emptyFn,
    commitFilesToFS = emptyAsyncFn,
    batch,
    logger,
    cacheProvider,
    defaultCacheKeys = []
  } = opts;

  function getContextBase(projectOptions: O, outputDir?: string) {
    return {
      options: {
        ...projectOptions,
        outputDir
      } as O & { outputDir?: string },
      renderTemplate
    };
  }

  const context = {
    ...getContextBase(options, outputDir),
    project,
    workspace,
    input,
    dependsOnFile,
    watchDependencies,
    longRunning,
    commitFilesToFS,
    *batch() {
      if (batch) {
        for (const { project, options } of batch) {
          yield {
            ...getContextBase(options),
            project
          };
        }
      } else {
        throw new Error('No batch');
      }
    },
    createOutputContainer(
      target: string | File,
      cacheKeys: string[],
      dependencies?: (string | File)[]
    ) {
      return new OutputContainer(
        cacheProvider,
        target,
        [...defaultCacheKeys, ...cacheKeys],
        dependencies
      );
    },
    fs,
    logger,
    file
  };

  return context;
}
