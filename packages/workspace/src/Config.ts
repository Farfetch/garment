export interface RunnerTaskDefinition {
  runner: string;
  pipe?: true | 'string';
  input?:
    | string
    | InputConfig
    | {
        type: 'custom';
        provider: string;
      };
  output?: string | string[];
  outputMode?: OutputMode;
  buildDependencies?:
    | boolean
    | string
    | {
        task: string;
        watch?: boolean;
        onlyDirect?: boolean;
      };
  options?: any;
  skipWatch?: boolean;

  parallel?: undefined;
  ref?: undefined;
}

export interface ParallelTaskDefinition<T> {
  parallel: T | T[] | ParallelTaskDefinition<T> | ParallelTaskDefinition<T>[];

  runner?: undefined;
  ref?: undefined;
}

export interface ReferenceTaskDefinition {
  ref: string;

  runner?: undefined;
  parallel?: undefined;
}

export interface WithNext<T> {
  next?: T | T[];
}

export type WithId<T> = T & { id: string };

export type TaskDefinition = (
  | RunnerTaskDefinition
  | ParallelTaskDefinition<RunnerTaskDefinition & ReferenceTaskDefinition>
  | ReferenceTaskDefinition
) &
  WithNext<
    | RunnerTaskDefinition
    | ParallelTaskDefinition<RunnerTaskDefinition & ReferenceTaskDefinition>
    | ReferenceTaskDefinition
    | string
  >;

export type ResolvedTaskDefinition = (
  | WithId<RunnerTaskDefinition>
  | ParallelTaskDefinition<WithId<RunnerTaskDefinition>>
) &
  WithNext<
    | WithId<RunnerTaskDefinition>
    | ParallelTaskDefinition<WithId<RunnerTaskDefinition>>
  >;

export type TaskConfig = TaskDefinition | string | (TaskDefinition | string)[];

export type ResolvedTaskConfig = ResolvedTaskDefinition;

export interface InputConfig {
  type: 'file';
  rootDir?: string;
  include?: string[];
  exclude?: string[];
}

export type OutputMode = 'after-all' | 'after-each' | 'in-memory';

export interface PresetConfig {
  extends?: string | string[];
  tasks?: {
    [name: string]: TaskConfig | false;
  };
}

export interface ProjectConfig extends PresetConfig {
  path: string;
  dependencies?: string[];
}

export type Cache =
  | { type: 'file'; cacheDir?: string }
  | { type: 'remote' }
  | { type: 'custom'; provider: string };

export interface Config {
  presets?: {
    [name: string]: PresetConfig;
  };
  projects: {
    [name: string]: ProjectConfig;
  };
  plugins?: string[] | [string, any][];
  schematics?: string[];
  yeomanGenerators?: string[];
  cache?: Cache;
  experimentalCacheSubscriptions?: boolean;
}
