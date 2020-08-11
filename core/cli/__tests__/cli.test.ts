import * as Path from 'path';
import execa = require('execa');
import stripAnsi from 'strip-ansi';
import { normalizeContainedPath } from '@garment/fixture-helper';

const cwd = Path.join(__dirname + '/fixtures/basic');
const garmentPath = Path.relative(cwd, 'core/cli/lib/cli.js');
const versionRegex = /v[0-9]+\.[0-9]+\.[0-9]+(.*)?/;
const noCacheArg = '--no-cache';

function execaSafe(...args: any[]) {
  //@ts-ignore
  return execa(...args)
    .then(({ stdout, stderr, ...rest }: any) => ({
      fulfilled: true,
      rejected: false,
      stdout: stripAnsi(stdout),
      stderr: stripAnsi(stderr),
      ...rest
    }))
    .catch((err: any) => ({
      fulfilled: false,
      rejected: true,
      reason: stripAnsi(err),
      stdout: '',
      stderr: stripAnsi(err.message)
    }));
}

test('cli should write help', async () => {
  const { stdout } = await execaSafe('node', [garmentPath, '-h', noCacheArg], {
    cwd: cwd
  });
  expect(stdout).toMatchSnapshot();
});

test('cli should execute if given correct number of commands', async () => {
  const { stdout } = await execaSafe(
    'node',
    [garmentPath, 'copy', noCacheArg],
    {
      cwd: cwd
    }
  );
  expect(stdout.replace(versionRegex, 'vX.X.X')).toMatchSnapshot();
});

test('cli should fail if given incorrect number of commands', async () => {
  const { stderr } = await execaSafe('node', [garmentPath, noCacheArg], {
    cwd: cwd
  });
  expect(normalizeContainedPath(stderr)).toMatchSnapshot();
});

test('cli should fail if given unexisting command', async () => {
  const { stderr } = await execaSafe('node', [garmentPath, 'dep', noCacheArg], {
    cwd: cwd
  });
  expect(normalizeContainedPath(stderr)).toMatchSnapshot();
});
