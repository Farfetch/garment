import handler from '../src';
import { initFixtureHelper, executeRunner } from '@garment/fixture-helper';

const { initFixture, clean } = initFixtureHelper(module, {
  tempDir: __dirname + 'tmp__'
});

afterAll(clean);

test('', async () => {
  const result = await executeRunner(handler, {}, {});
});
