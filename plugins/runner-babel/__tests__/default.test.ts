import runner from '../src';
import { initFixtureHelper, executeRunner2 } from '@garment/fixture-helper';

const { initFixture, clean } = initFixtureHelper(module, {
  tempDir: __dirname + 'tmp__'
});

afterAll(clean);

test('Uses babel.config.js from workspace root', async () => {
  const cwd = await initFixture('basic');

  const result = await executeRunner2(
    runner,
    {},
    {
      projectRelativePath: 'test-project',
      cwd,
      files: file => [file.text('index.js', 'const a = 10;')]
    }
  );

  expect(result).toMatchSnapshot();
});

test('Uses .babelrc from workspace root', async () => {
  const cwd = await initFixture('basic');

  const result = await executeRunner2(
    runner,
    { babelrc: true },
    {
      projectRelativePath: 'test-project',
      cwd,
      files: file => [file.text('index.js', 'const a = 10;')]
    }
  );

  expect(result).toMatchSnapshot();
});

test('Uses babel.config.js from project', async () => {
  const cwd = await initFixture('basic');

  const result = await executeRunner2(
    runner,
    { configFile: '{{projectDir}}/babel.config.js' },
    {
      projectRelativePath: 'test-project',
      cwd,
      files: file => [file.text('index.js', 'const Header = <h1>Hello!</h1>')]
    }
  );

  expect(result).toMatchSnapshot();
});

test('Outputs .js extentension for TS files', async () => {
  const cwd = await initFixture('typescript');

  const result = await executeRunner2(
    runner,
    { configFile: 'babel.config.js' },
    {
      projectRelativePath: 'test-project',
      cwd,
      files: file => [file.text('index.ts', 'const message: string = "Hello"')]
    }
  );

  expect(result).toMatchSnapshot();
});
