import {
  createBatchContext,
  initFixtureHelper,
  replaceTestPath
} from '@garment/fixture-helper';
import { getConfig, JestRunnerOptions } from '../src';

const { initFixture, clean } = initFixtureHelper(module, {
  tempDir: __dirname + 'tmp__'
});

afterAll(clean);

test('Handles multiple projects sharing the same config', async () => {
  const cwd = await initFixture('basic');
  const { context } = await createBatchContext<JestRunnerOptions>(
    {
      foo: { configFile: 'jest.config.js' },
      bar: { configFile: 'jest.config.js' }
    },
    { cwd, schema: require('../src/schema.json') }
  );

  const jestConfig = await getConfig(context);

  expect(replaceTestPath(jestConfig, cwd)).toMatchSnapshot();
});

test('Handles multiple projects sharing the same config and one having different config', async () => {
  const cwd = await initFixture('basic');
  const { context } = await createBatchContext<JestRunnerOptions>(
    {
      foo: { configFile: 'jest.config.js' },
      bar: { configFile: 'jest.config.js' },
      test: { configFile: '{{projectDir}}/jest.config.js' }
    },
    { cwd, schema: require('../src/schema.json') }
  );

  const jestConfig = await getConfig(context);

  expect(replaceTestPath(jestConfig, cwd)).toMatchSnapshot();
});
