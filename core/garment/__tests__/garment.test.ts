import { executeRunner2, initFixtureHelper } from '@garment/fixture-helper';
import * as Path from 'path';
import { createFileInput } from '../src';

const { initFixture, clean } = initFixtureHelper(module, {
  tempDir: Path.join(__dirname, '/tmp__')
});

afterAll(clean);

describe('createFileInput', () => {
  test('It does basic glob pattern matching', async () => {
    const includedExtension = '.js';
    const excludedName = 'exclude-me';

    const testDir = await initFixture('basic', {
      files: {
        [`index${includedExtension}`]: 'mock content',
        [`some-name-${excludedName}-file${includedExtension}`]: 'mock content',
        'something.html': 'mock content'
      }
    });

    const input = createFileInput({
      rootDir: testDir,
      include: [`*${includedExtension}`],
      exclude: [`*${excludedName}*`]
    });

    let filesCount = 0;
    for (let file of input) {
      const { name, ext } = Path.parse(file.path);
      expect(ext).toBe(includedExtension);
      expect(name).not.toContain(excludedName);

      filesCount++;
    }

    expect(filesCount).toBe(1);
  });

  test('glob pattern matching includes files whose names begin with a dot', async () => {
    const testDir = await initFixture('basic', {
      files: {
        '.gitignore': 'mock content',
        '.npmrc': 'more mock content'
      }
    });

    // We need a file in fixtures directory to keep in source control for initFixture
    const fixtureKeep = '.gitkeep';
    const allFilesGlob = '*';
    const input = createFileInput({
      rootDir: testDir,
      include: [allFilesGlob],
      exclude: [fixtureKeep]
    });

    let filesCount = 0;
    for (let file of input) {
      filesCount++;
    }

    expect(filesCount).toBe(2);
  });

  test('should throw with a clear error message when rootDir does not exist', async () => {
    const testDir = await initFixture('basic');

    const nonExistingDirectory = Path.join(testDir, 'nonExistingDirectory');
    const generator = createFileInput({
      rootDir: nonExistingDirectory
    });

    const createFileInputForNonExistingRootDirectory = () => {
      generator.next();
    };

    expect(createFileInputForNonExistingRootDirectory).toThrow(
      /nonExistingDirectory/
    );
  });
});
