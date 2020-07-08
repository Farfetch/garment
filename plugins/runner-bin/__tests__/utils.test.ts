import { parseOptions, resolveBin } from '../src/utils';
import * as Path from 'path';

describe('parseOptions function ', () => {
  const expectedResult = ['prettier', '-o', '--output-dir', 'index.js'];

  test('has bin and args as string ', () => {
    const parsedResult = parseOptions({
      bin: 'prettier',
      args: '-o --output-dir  index.js'
    });
    expect(parsedResult).toMatchObject(expectedResult);
  });

  test('has bin and args as array ', () => {
    const parsedResult = parseOptions({
      bin: 'prettier',
      args: ['-o', '--output-dir', 'index.js']
    });
    expect(parsedResult).toMatchObject(expectedResult);
  });

  test('has bin and args as object ', () => {
    const parsedResult = parseOptions({
      bin: 'prettier',
      args: { o: true, outputDir: true, _: 'index.js' }
    });
    expect(parsedResult).toMatchObject(expectedResult);
  });

  test('not has bin and args as string ', () => {
    const parsedResult = parseOptions({
      args: 'prettier -o --output-dir index.js'
    });
    expect(parsedResult).toMatchObject(expectedResult);
  });

  test('not has bin and args as array ', () => {
    const parsedResult = parseOptions({
      args: ['prettier', '-o', '--output-dir', 'index.js']
    });
    expect(parsedResult).toMatchObject(expectedResult);
  });

  test('not has bin and args as object ', () => {
    expect(() =>
      parseOptions({
        args: { o: true, outputDir: true, _: 'index.js' }
      })
    ).toThrow();
  });
});

describe('resolveBin function ', () => {
  const cwd = Path.resolve('test-manual/react-box');
  const expectedResult = Path.resolve(
    __dirname,
    '../../../node_modules/.bin',
    'prettier'
  );

  test('if gets bin name returns as resolved bin', async () => {
    expect(await resolveBin('prettier')).toBe(expectedResult);
  });

  test('if gets bin path returns as fullPath', async () => {
    const actual = await resolveBin('../../node_modules/.bin/prettier', cwd);
    expect(actual).toBe(expectedResult);
  });

  test('if gets non existing bin name returns as is', async () => {
    expect(await resolveBin('danielamaia')).toBe('danielamaia');
  });
});
