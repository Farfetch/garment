import {
  executeRunner2,
  initFixtureHelper,
  ExecuteRunner2Result
} from '@garment/fixture-helper';
import * as Path from 'path';
import handler from '../src';
import os = require('os');

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

  const [hash] = extractHashes(result, 'mockHash');

  expect(result).toMatchSnapshot();

  if (os.platform() === 'win32') {
    expect(hash).toBe('b2fa5e79e89879036728c19a038eafac');
  } else {
    expect(hash).toBe('8de170ce8b6d1c1aeb78d959f4faa0cf');
  }
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

  const [hash] = extractHashes(result, 'mockHash');

  expect(result).toMatchSnapshot();

  if (os.platform() === 'win32') {
    expect(hash).toBe('85e0de080544f7c03f6fa022840ccdaa');
  } else {
    expect(hash).toBe('e1c061eef28e0cce2b1ff22fb7f6e12c');
  }
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

  const [hash] = extractHashes(result, 'mockHash');

  expect(result).toMatchSnapshot();

  if (os.platform() === 'win32') {
    expect(hash).toBe('b2fa5e79e89879036728c19a038eafac');
  } else {
    expect(hash).toBe('8de170ce8b6d1c1aeb78d959f4faa0cf');
  }
});

function extractHashes(
  result: ExecuteRunner2Result,
  replacement: string
): string[] {
  const { collectedOutput } = result;
  const md5Regex = /^[a-f0-9]{32}$/i;

  const originalHashes: string[] = [];

  collectedOutput.forEach((output: any) => {
    if (output.hasOwnProperty('cacheKeys')) {
      output.cacheKeys = output.cacheKeys.map((cacheKey: string) => {
        if (md5Regex.test(cacheKey)) {
          originalHashes.push(cacheKey);
          return replacement;
        } else {
          return cacheKey;
        }
      });
    }
  });

  return originalHashes;
}
