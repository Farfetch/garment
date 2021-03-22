import { RunnerHandler, RunnerCacheKeys } from './getRunnerMeta';

type TypeMap = {
  'path?'?: string;
  path: string;
  'number?'?: number;
  number: number;
  'string?'?: string;
  string: string;
  'boolean?'?: boolean;
  boolean: boolean;
  'path[]?'?: string[];
  'path[]': string[];
  'number[]?'?: number[];
  'number[]': number[];
  'string[]?'?: string[];
  'string[]': string[];
  'boolean[]?'?: boolean[];
  'boolean[]': boolean[];
};

type TypeMapWithDefault = {
  'path?': string;
  'number?': number;
  'string?': string;
  'boolean?': boolean;
  'path[]?': string[];
  'number[]?': number[];
  'string[]?': string[];
  'boolean[]?': boolean[];
};

type TypeKeys = keyof TypeMap | keyof TypeMapWithDefault;

type OptionsArg = {
  [key: string]:
    | TypeKeys
    | [TypeKeys]
    | [TypeKeys, string]
    | ['path?', string, TypeMap['path']]
    | ['number?', string, TypeMap['number']]
    | ['string?', string, TypeMap['string']]
    | ['boolean?', string, TypeMap['boolean']];
  // | OptionsArg;
};

export type RunnerOptions<O extends OptionsArg> = {
  [key in keyof O]: O[key][0] extends TypeKeys
    ? O[key] extends [any, string, any]
      ? TypeMapWithDefault[O[key][0]]
      : TypeMap[O[key][0]]
    : O[key] extends TypeKeys
    ? TypeMap[O[key]]
    : O[key] extends OptionsArg
    ? RunnerOptions<O[key]>
    : never;
};

export type OptionsSchema<T> = {
  schema: any;
  type: T;
};

export function defineOptions<T extends OptionsArg>(
  opts: T
): OptionsSchema<RunnerOptions<T>> {
  const schema = {
    properties: {} as {
      [prop: string]: {
        type: string;
        description?: string;
        format?: string;
        default?: any;
        items?: any;
      };
    },
    required: [] as string[],
    additionalProperties: false
  };
  Object.entries(opts).forEach(([key, value]) => {
    const [typeWithModifier, description, defaultValue] = Array.isArray(value)
      ? value
      : [value];
    const [, type, isArray, isOptional] =
      typeWithModifier.match(/([a-z]*)(\[\])?(\?)?$/) || [];
    schema.properties[key] = isArray
      ? {
          type: 'array',
          items: {
            type,
            description,
            default: defaultValue,
            ...(type === 'path' && { type: 'string', format: 'path' })
          }
        }
      : {
          type,
          description,
          default: defaultValue,
          ...(type === 'path' && { type: 'string', format: 'path' })
        };
    if (!isOptional) {
      schema.required.push(key);
    }
  });
  return {
    schema,
    type: {} as RunnerOptions<T>
  };
}

export function defineOptionsFromJSONSchema<T>(schema: any): OptionsSchema<T> {
  return {
    schema,
    type: {} as T
  };
}

export function defineRunner(
  handler: RunnerHandler<Record<string, any>>
): { options: OptionsSchema<Record<string, any>>; handler: typeof handler };
export function defineRunner<O>(
  options: OptionsSchema<O>,
  handler: RunnerHandler<O>
): { options: typeof options; handler: typeof handler };
export function defineRunner<O>(
  paramOne: OptionsSchema<O> | RunnerHandler<O>,
  handler?: RunnerHandler<O>
) {
  return typeof paramOne === 'function'
    ? { options: {}, handler: paramOne }
    : { options: paramOne, handler };
}

export function defineCacheKeys<O>(
  options: OptionsSchema<O> | null,
  cacheKeysFn: RunnerCacheKeys<O>
) {
  return { options, cacheKeysFn };
}

export function defineWatch<O>(
  options: OptionsSchema<O> | {},
  handler: RunnerHandler<O>
) {
  return { options, handler };
}
