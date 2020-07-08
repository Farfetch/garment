import handler from '../src';
import { initFixtureHelper, executeRunner2 } from '@garment/fixture-helper';
import { file } from '@garment/runner';

const { initFixture, clean } = initFixtureHelper(module, {
  tempDir: __dirname + 'tmp__'
});

afterAll(clean);

const files = [
  file.text('index.js', 'const a = 10'),
  file.text('foo.js', 'var a = "Im still using vars";')
];

test('Emits errors and warnings', async () => {
  const cwd = await initFixture('basic');

  const result = await executeRunner2(
    handler,
    {},
    {
      cwd,
      files
    }
  );

  expect(result).toMatchSnapshot();
});

test('Emits fixed files', async () => {
  const cwd = await initFixture('basic');

  const result = await executeRunner2(
    handler,
    { fix: true },
    {
      cwd,
      files,
      outputDir: '/some/output/dir'
    }
  );

  expect(result).toMatchSnapshot();
});

test('Takes into account .eslintignore', async () => {
  const cwd = await initFixture('ignore');

  const result = await executeRunner2(
    handler,
    {},
    {
      cwd,
      files
    }
  );

  expect(result).toMatchSnapshot();
});
