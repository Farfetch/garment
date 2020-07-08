import { executeRunner2, initFixtureHelper } from '@garment/fixture-helper';
import * as Path from 'path';
import handler from '../src';

const { initFixture, clean } = initFixtureHelper(module, {
  tempDir: __dirname + 'tmp__'
});

afterAll(clean);

beforeEach(async () => {
  jest.setTimeout(10000);
});

test('Uses postcss.config.js from workspace root', async () => {
  const cwd = await initFixture('basic');

  const result = await executeRunner2(handler, {} as any, {
    projectRelativePath: 'test-project',
    cwd,
    files: file => [file.text('index.css', `:fullscreen {}`)]
  });

  expect(result).toMatchSnapshot();
});

test('Uses postcss.config.js from project', async () => {
  const cwd = await initFixture('basic');

  const result = await executeRunner2(
    handler,
    { configFile: '{{projectDir}}/postcss.config.js' },
    {
      projectRelativePath: 'test-project',
      cwd,
      files: file => [
        file.text(
          'index.css',
          `
          :root {
            --color: red;
          }
          :fullscreen {color: var(--color);}
          `
        )
      ]
    }
  );

  expect(result).toMatchSnapshot();
});

test('Resolves postcss @import', async () => {
  const cwd = await initFixture('basic');

  const src = (p = '') => Path.join(cwd, 'test-project', p);

  const result = await executeRunner2(handler, {} as any, {
    projectRelativePath: 'test-project',
    cwd,
    files: () => [
      {
        path: 'test2.css',
        rootDir: src(),
        absolutePath: src('test2.css'),
        type: 'text',
        data: `
          @import './test.css'; 
          .Slideshow {
            position: relative;
            height: 50%;
        }`
      }
    ]
  });

  expect(result).toMatchSnapshot();
});
