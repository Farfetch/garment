import { initFixtureHelper, executeRunner } from '@garment/fixture-helper';
import * as Path from 'path';

const run = jest.fn(() => 0);

const launcherMock = jest.fn(() => ({ run }));

jest.mock('@wdio/cli', () => {
  return {
    __esModule: true,
    default: launcherMock
  };
});
import { singleRunner } from '../src/default';

const { initFixture, clean } = initFixtureHelper(module, {
  tempDir: __dirname + 'tmp__'
});

afterAll(clean);
test("Creates an instance of wdio's launcher and runs the specs", async () => {
  const cwd = await initFixture('basic');

  const configFile = './wdio.conf.js';
  const testSpecsPath = './specs/**.*js';

  await executeRunner(
    singleRunner,
    {
      testSpecsPath,
      configFile
    },
    {
      projectRelativePath: 'test-project',
      cwd
    }
  );

  expect(launcherMock).toHaveBeenCalledWith(Path.join(cwd, configFile), {
    specs: [Path.join(cwd, testSpecsPath)]
  });

  expect(run).toHaveBeenCalled();
});
