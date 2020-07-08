import { executeRunner2, initFixtureHelper } from '@garment/fixture-helper';
import handler from '../src';

const { initFixture, clean } = initFixtureHelper(module, {
  tempDir: __dirname + 'tmp__'
});

afterAll(clean);

test('Creates typings for CSS file', async () => {
  const result = await executeRunner2(
    handler,
    {},
    {
      projectRelativePath: 'test-project',
      files: file => [
        file.text(
          'index.css',
          '.foo { color: red; } .bar { background: black; }'
        ),
        file.text('component/style.css', '.content { font-size: 2em; }')
      ]
    }
  );

  expect(result).toMatchSnapshot();
});
