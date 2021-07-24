import paramCase = require('param-case');
import * as Path from 'path';
const which = require('npm-which');

export function parseOptions(options: {
  bin?: string;
  args?: string | string[] | { [key: string]: boolean | string | string[] };
}): string[] {
  const { bin, args = [] } = options;
  const parsedOptions: string[] = [];

  if (typeof args === 'string') {
    parsedOptions.push(...args.split(/\s+/));
  } else if (Array.isArray(args)) {
    parsedOptions.push(...args);
  } else if (!bin) {
    throw Error(
      'You need to specify bin option in order to use args as an object type'
    );
  } else {
    const positionalArgs: string[] = [];
    for (const [key, value] of Object.entries(args)) {
      if (key === '_') {
        positionalArgs.push(...arrayfy(value as string | string[]));
      } else if (value) {
        parsedOptions.push(`-${key.length > 1 ? '-' : ''}${paramCase(key)}`);
        if (typeof value !== 'boolean') {
          parsedOptions.push(...arrayfy(value));
        }
      }
    }
    parsedOptions.push(...positionalArgs);
  }

  if (bin) {
    parsedOptions.unshift(bin);
  }

  return parsedOptions;
}

export async function resolveBin(binOption: string, cwd = process.cwd()) {
  if (binOption === Path.basename(binOption)) {
    return new Promise<string>((resolve) => {
      which(cwd)(binOption, (err: any, bin: string) => {
        if (err) resolve(binOption);
        return resolve(bin);
      });
    });
  } else {
    return Path.resolve(cwd, binOption);
  }
}

function arrayfy<T>(arr: T | T[]) {
  return Array.isArray(arr) ? arr : [arr];
}
