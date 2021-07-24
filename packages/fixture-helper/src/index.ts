export * from './executeRunner';
export * from './initFixtureHelper';
export * from './resolver';
import normalizePath = require('normalize-path');
import isValidPath = require('is-valid-path');

const containsValidPath = (value: string): boolean =>
  value.split(/\s/).some((s) => isValidPath(s));

export const normalizeContainedPath = (value: string): string => {
  return value
    .split(/(\s)/)
    .map((s) => {
      if (isValidPath(s)) {
        return normalizePath(s);
      } else {
        return s;
      }
    })
    .join('');
};

export function replaceTestPath<T>(
  obj: T,
  testPath: string,
  replaceWith = '/test_path'
): T {
  const normalizedTestPathRegEx = new RegExp(normalizePath(testPath), 'g');
  return JSON.parse(
    JSON.stringify(obj, (_, value) =>
      typeof value === 'string' && containsValidPath(value)
        ? normalizeContainedPath(value).replace(
            normalizedTestPathRegEx,
            replaceWith
          )
        : value
    )
  );
}
