export * from './executeRunner';
export * from './initFixtureHelper';

export function replaceTestPath<T>(
  obj: T,
  testPath: string,
  replaceWith = '/test_path'
): T {
  return JSON.parse(
    JSON.stringify(obj, (_, value) =>
      typeof value === 'string'
        ? value.replace(new RegExp(testPath, 'g'), replaceWith)
        : value
    )
  );
}
