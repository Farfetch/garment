import { Level, Logger } from '@garment/logger';
import {
  File,
  file,
  getRunnerContext,
  OptionsSchema,
  RunnerCacheKeys,
  RunnerHandler,
  CacheProvider,
  InputFnCallBack,
  OutputContainer,
  renderOptions,
  InputFn,
} from '@garment/runner';
import { Project, ProjectConfig, Workspace } from '@garment/workspace';
import * as fs from 'fs-extra';
import * as globby from 'globby';
import * as Path from 'path';
import stripAnsi from 'strip-ansi';
import * as tempy from 'tempy';
import { replaceTestPath } from '.';

export interface CommonOptions {
  outputDir?: string;
  useTempOutputDir?: boolean;
  logsStripAnsi?: boolean;
  replacePaths?: boolean;
  projectRelativePath?: string;
  cwd?: string;
  files?: ((fileFactory: typeof file) => File[]) | File[];
}

type UnPromise<T extends Promise<any>> = T extends Promise<infer U> ? U : never;

export type ExecuteRunner2Result = UnPromise<ReturnType<typeof executeRunner2>>;

const cacheProviderMock: CacheProvider = {
  has: () => false,
  get: () => {},
  set: () => {},
};

export async function createContext<O>(
  runnerOptions: O,
  schema: any,
  options: CommonOptions
) {
  const {
    cwd = process.cwd(),
    files = [],
    projectRelativePath = 'test',
    outputDir,
    useTempOutputDir,
    logsStripAnsi = true,
  } = options;

  const projectPath = Path.resolve(cwd, projectRelativePath);

  await fs.ensureDir(projectPath);

  const workspace = Workspace.create(
    {
      projects: { test: { path: projectRelativePath } },
    },
    { cwd }
  );
  const project = workspace.projects.get('test')!;

  const logs: { level: Level; args: any[] }[] = [];
  const logger = new Logger('', 'test', 'silly');
  logger.interceptors.push(({ level, args }) => {
    logs.push({ level, args: logsStripAnsi ? args.map(stripAnsi) : args });
    return false;
  });

  let tempOutputDir: string | undefined;
  if (useTempOutputDir) {
    tempOutputDir = tempy.directory();
  }

  const inputList: File[] = [];
  const context = getRunnerContext({
    workspace,
    project,
    input: makeInputFn()[0],
    dependsOnFile() {},
    options: renderOptions({
      options: runnerOptions,
      workspace,
      project,
      schema,
    }) as any,
    logger,
    outputDir: outputDir || tempOutputDir,
    cacheProvider: cacheProviderMock,
  });

  const filesToAdd = typeof files === 'function' ? files(file) : files;

  inputList.push(
    ...filesToAdd.map(({ absolutePath, ...rest }) => ({
      ...rest,
      absolutePath: absolutePath || Path.resolve(projectPath, rest.path),
    }))
  );

  return { context, logs, tempOutputDir };
}

export async function createBatchContext<O>(
  batchMap: { [projectName: string]: O },
  options: {
    cwd?: string;
    useTempOutputDir?: boolean;
    logsStripAnsi?: boolean;
    schema?: any;
  } = {}
) {
  const { cwd = process.cwd(), logsStripAnsi = true, schema = {} } = options;

  const projects: { [name: string]: ProjectConfig } = {};
  for (const projectName of Object.keys(batchMap)) {
    const projectPath = Path.resolve(cwd, projectName);
    await fs.ensureDir(projectPath);

    projects[projectName] = { path: projectName };
  }

  const workspace = Workspace.create(
    {
      projects,
    },
    { cwd }
  );

  const batch = Object.keys(batchMap).map((projectName) => {
    const project = workspace.projects.get(projectName)!;
    return {
      project,
      options: renderOptions({
        options: batchMap[projectName],
        workspace,
        project,
        schema,
      }),
    };
  });

  const logs: { level: Level; args: any[] }[] = [];
  const logger = new Logger('', 'batch', 'silly');
  logger.interceptors.push(({ level, args }) => {
    logs.push({ level, args: logsStripAnsi ? args.map(stripAnsi) : args });
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
      extendsSet: new Set(),
    }),
    options: {} as O,
    input: makeInputFn()[0],
    dependsOnFile() {},
    batch,
    logger,
    cacheProvider: cacheProviderMock,
  });

  return { context, logs };
}

export async function executeRunner<O>(
  runner: { handler: RunnerHandler<O>; options: OptionsSchema<O> | null },
  runnerOptions: Partial<OptionsSchema<O>['type']>,
  options: CommonOptions = {}
) {
  const { context, logs, tempOutputDir } = await createContext(
    runnerOptions as OptionsSchema<O>['type'],
    runner.options?.schema,
    options
  );

  let output = (await runner.handler(context)) || [];

  if (tempOutputDir) {
    output = Array.from(
      createFileInput({
        rootDir: tempOutputDir,
        files: globby.sync('**/*', { cwd: tempOutputDir, absolute: true }),
      })
    );
  }

  return {
    logs,
    output,
  };
}

export async function executeCacheKeys<O>(
  runnerCacheKeys: {
    cacheKeysFn: RunnerCacheKeys<O>;
    options: OptionsSchema<O> | null;
  },
  runnerOptions: Partial<OptionsSchema<O>['type']>,
  options: CommonOptions = {}
) {
  const { context } = await createContext(
    runnerOptions as OptionsSchema<O>['type'],
    runnerCacheKeys.options?.schema,
    options
  );

  const output = (await runnerCacheKeys.cacheKeysFn(context)) || [];

  return output;
}

async function toArray<T>(iterable: Iterable<T> | AsyncIterable<T>) {
  const result: T[] = [];
  for await (const item of iterable) {
    result.push(item);
  }
  return result;
}

function* createFileInput({
  rootDir,
  files,
}: {
  rootDir: string;
  files: string[];
}) {
  for (const absolutePath of files) {
    const content = fs.readFileSync(absolutePath, 'utf8');
    const file: File = {
      type: 'text',
      path: Path.relative(rootDir, absolutePath),
      absolutePath,
      baseDir: rootDir,
      data: content,
    };
    yield file;
  }
}

export async function executeRunner2<O>(
  runner: { handler: RunnerHandler<O>; options: OptionsSchema<O> | null },
  runnerOptions: OptionsSchema<O>['type'],
  options: CommonOptions = {}
) {
  let shouldWatchDependencies = false;
  let isLongRunning = false;
  let onDestroyHandler: (() => void) | undefined;
  let dependsOnFile: string[] = [];

  const {
    cwd = process.cwd(),
    files = [],
    projectRelativePath = 'test',
    outputDir,
    useTempOutputDir,
    logsStripAnsi = true,
    replacePaths = true,
  } = options;

  const projectPath = Path.resolve(cwd, projectRelativePath);

  await fs.ensureDir(projectPath);

  const workspace = Workspace.create(
    {
      projects: { test: { path: projectRelativePath } },
    },
    { cwd }
  );
  const project = workspace.projects.get('test')!;

  const logs: { level: Level; args: any[] }[] = [];
  const logger = new Logger('', 'test', 'silly');
  logger.interceptors.push(({ level, args }) => {
    logs.push({ level, args: logsStripAnsi ? args.map(stripAnsi) : args });
    return false;
  });

  let tempOutputDir: string | undefined;
  if (useTempOutputDir) {
    tempOutputDir = tempy.directory();
  }

  const joinedInput = (typeof files === 'function' ? files(file) : files).map(
    ({ absolutePath, ...rest }) => ({
      ...rest,
      absolutePath: absolutePath || Path.resolve(projectPath, rest.path),
    })
  );

  const [inputFn, executeInputFn] = makeInputFn();

  const context = getRunnerContext({
    workspace,
    project,
    options: renderOptions({
      options: runnerOptions,
      workspace,
      project,
      schema: runner.options?.schema,
    }) as any,
    outputDir: outputDir || tempOutputDir,
    cacheProvider: cacheProviderMock,
    defaultCacheKeys: [],
    input: inputFn,
    dependsOnFile(...paths) {
      dependsOnFile.push(...paths);
    },
    watchDependencies() {
      shouldWatchDependencies = true;
    },
    longRunning(onDestroy) {
      onDestroyHandler = onDestroy;
      isLongRunning = true;
    },
    commitFilesToFS: jest.fn(),
    logger,
  });

  const collectedOutput: (File | OutputContainer)[] = [];

  const handlerOutputs = arrayfy(await runner.handler(context));

  // Run .input() for each file, read output's dependencies and add input-level subscription for each one
  const outputs = await executeInputFn(joinedInput);
  for (const output of outputs) {
    collectedOutput.push(output);
  }

  // If a runner returned output, process it almost like in .input() case but
  // all the files' dependencies are added as runner-level subscriptions
  for (const handlerOutput of handlerOutputs) {
    if (handlerOutput) {
      collectedOutput.push(handlerOutput);
    }
  }

  if (tempOutputDir) {
    collectedOutput.push(
      ...createFileInput({
        rootDir: tempOutputDir,
        files: globby.sync('**/*', {
          cwd: tempOutputDir,
          absolute: true,
        }),
      })
    );
  }

  const result = {
    collectedOutput,
    logs,
    shouldWatchDependencies,
    isLongRunning,
    dependsOnFile,
  };

  return {
    ...(replacePaths ? replaceTestPath(result, cwd) : result),
    onDestroyHandler,
  };
}

function arrayfy<T>(arr: T | T[] = []) {
  return Array.isArray(arr) ? arr : [arr];
}

function makeInputFn() {
  let isInputAlreadyCalled = false;
  let inputFnCallback:
    | { type: 'single'; fn: InputFnCallBack }
    | { type: 'multi'; fn: InputFnCallBack<File[]> };
  const inputFn = ((fn: InputFnCallBack<File[]>) => {
    if (isInputAlreadyCalled) {
      throw new Error(
        `context.input() can only be called once during the runner's execution`
      );
    }
    inputFnCallback = {
      type: 'multi',
      fn,
    };
    isInputAlreadyCalled = true;
  }) as InputFn;

  inputFn.forEach = (fn) => {
    if (isInputAlreadyCalled) {
      throw new Error(
        `context.input() can only be called once during the runner's execution`
      );
    }
    inputFnCallback = {
      type: 'single',
      fn,
    };
    isInputAlreadyCalled = true;
  };

  async function execute(files: File[]) {
    if (!inputFnCallback) {
      return [];
    }
    if (inputFnCallback.type === 'single') {
      const results: (File | OutputContainer)[] = [];
      for (const file of files) {
        const outputs = await inputFnCallback.fn(file);
        if (outputs) {
          results.push(...arrayfy(outputs));
        }
      }
      return results;
    } else {
      const outputs = await inputFnCallback.fn(files);
      return outputs ? arrayfy(outputs) : [];
    }
  }

  return [inputFn, execute] as const;
}
