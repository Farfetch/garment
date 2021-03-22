import { executeRunner2, initFixtureHelper } from '@garment/fixture-helper';
import * as Path from 'path';
import handler from '../src';

const { initFixture, clean } = initFixtureHelper(module, {
  tempDir: Path.join(__dirname, 'tmp__')
});

afterAll(clean);

test('Transpiles TypeScript', async () => {
  const cwd = await initFixture('basic');

  const src = (p = '') => Path.join(cwd, 'test-project', 'src', p);

  const result = await executeRunner2(
    handler,
    { configFile: 'tsconfig.json' },
    {
      projectRelativePath: 'test-project',
      cwd,
      files: file => [
        file.text('index.ts', 'export const foo: number = 420;', {
          absolutePath: src('nested/index.ts'),
          baseDir: src()
        })
      ]
    }
  );

  expect(result).toMatchSnapshot();
});

test('Transpiles TypeScript with relative imports including not provided as input', async () => {
  const cwd = await initFixture('basic');

  const src = (p = '') => Path.join(cwd, 'test-project', 'src', p);

  const result = await executeRunner2(
    handler,
    { configFile: 'tsconfig.json' },
    {
      projectRelativePath: 'test-project',
      cwd,
      files: file => [
        file.text('nested/index.ts', 'export const foo: number = 420;', {
          absolutePath: src('nested/index.ts'),
          baseDir: src()
        }),
        file.text(
          'main/index.ts',
          'import { foo } from "../nested"; console.log(foo);',
          { absolutePath: src('main/index.ts'), baseDir: src() }
        )
      ]
    }
  );

  expect(result).toMatchSnapshot();
});

test('Transpiles TypeScript', async () => {
  const cwd = await initFixture('config-extends');

  const src = (p = '') => Path.join(cwd, 'test-project', 'src', p);

  const result = await executeRunner2(
    handler,
    { configFile: 'tsconfig.json' },
    {
      projectRelativePath: 'test-project',
      cwd,
      files: file => [
        file.text(
          'index.ts',
          'export const greet = (str: string) => `Hello, ${str}`',
          {
            absolutePath: src('nested/index.ts'),
            baseDir: src()
          }
        )
      ]
    }
  );

  expect(result).toMatchSnapshot();
});

test('Transpiles TypeScript when configFile contains npm module in extends field', async () => {
  const cwd = await initFixture('config-extends-npm-module', { staticId: 0 });

  const src = (p = '') => Path.join(cwd, 'test-project', 'src', p);

  const result = await executeRunner2(
    handler,
    { configFile: 'tsconfig.json' },
    {
      projectRelativePath: 'test-project',
      cwd,
      files: file => [
        file.text(
          'index.ts',
          'export const greet = (str: string) => `Hello, ${str}`',
          {
            absolutePath: src('nested/index.ts'),
            baseDir: src()
          }
        )
      ]
    }
  );

  expect(result).toMatchSnapshot();
});
