import runner from '../src/index';
import { initFixtureHelper, executeRunner2 } from '@garment/fixture-helper';
import waitPort = require('wait-port');

const { initFixture, clean } = initFixtureHelper(module, {
  tempDir: __dirname + 'tmp__'
});

afterAll(clean);

test('Starts server on given port', async () => {
  const { onDestroyHandler } = await executeRunner2(runner, { port: 9001 }, {});

  const params = {
    host: 'localhost',
    port: 9001
  };

  try {
    // @ts-ignore
    const open = await waitPort(params);

    expect(open).toBe(true);
  } finally {
    onDestroyHandler?.();
  }
});
