import * as Path from 'path';

export function requireDefault<T = any>(
  packageName: string,
  relativePath: string = ''
): T {
  const fullPath = Path.join(packageName, relativePath);

  const module = require(fullPath);
  if (typeof module.default === 'undefined') {
    throw new Error(`Module "${fullPath}" doesn't have default export`);
  }
  return module.default;
}

export function requireClass<T>(): T extends new (...args: any[]) => T
  ? T
  : never {
  return 0 as any;
}
