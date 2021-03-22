import handler from '../src';
import { initFixtureHelper, executeRunner2 } from '@garment/fixture-helper';
import { file } from '@garment/runner';

const { initFixture, clean } = initFixtureHelper(module, {
  tempDir: __dirname + 'tmp__'
});

afterAll(clean);

test('Emits style errors and warnings', async () => {
  const cwd = await initFixture('basic');

  const result = await executeRunner2(
    handler,
    { configFile: '.stylelintrc.json' },
    {
      cwd,
      files: [
        file.text('foo.css', '.foo { color: #00; }'),
        file.text('bar.css', '.bar { huight: 100px; }')
      ]
    }
  );

  expect(result).toMatchSnapshot();
});

test('Emits style fixed files', async () => {
  const cwd = await initFixture('basic');

  const result = await executeRunner2(
    handler,
    { configFile: '.stylelintrc.json', fix: true },
    {
      cwd,
      files: [file.text('baz.css', '.baz { color: #bada55; }')],
      outputDir: '/some/output/dir'
    }
  );

  expect(result).toMatchSnapshot();
});
