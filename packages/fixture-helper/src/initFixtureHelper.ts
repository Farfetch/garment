import fs = require('fs-extra');
import path = require('path');
import tempy = require('tempy');

const getId = ((id = 0) => (staticId?: number) =>
  staticId !== undefined ? staticId : id++)();

export function initFixtureHelper(
  mdl: NodeModule,
  options: { destination?: string; tempDir?: string } = {}
) {
  const dirs: string[] = [];
  const { tempDir: userTempDir, destination } = options;
  const testDir = path.dirname(mdl.filename);
  const testName = path.basename(mdl.filename, '.test.ts');

  const clean = () => {
    return Promise.all(dirs.map((dir) => fs.remove(dir)));
  };

  const initFixture = async (
    fixtureName: string,
    initOptions: {
      files?: { [path: string]: string | object };
      copy?: { [fromPath: string]: string };
      staticId?: number;
    } = {}
  ) => {
    const { copy, files, staticId } = initOptions;
    const tempDir = userTempDir
      ? path.resolve(
          userTempDir,
          `${testName}-${fixtureName}-${getId(staticId)}`
        )
      : tempy.directory();

    const fixtureDir = path.resolve(testDir, 'fixtures', fixtureName);

    const isDirExists = await fs.pathExists(tempDir);
    if (!isDirExists) {
      await fs.mkdirp(tempDir);
    } else if (!userTempDir) {
      await fs.remove(tempDir);
    }

    await fs.copy(
      fixtureDir,
      destination ? path.resolve(tempDir, destination) : tempDir
    );

    if (copy && typeof copy === 'object') {
      await Promise.all(
        Object.keys(copy).map((fromPath) => {
          const resolvedFromPath = path.resolve(testDir, fromPath);
          const resolvedToPath = path.resolve(tempDir, copy[fromPath]);
          return fs.copy(resolvedFromPath, resolvedToPath);
        })
      );
    }

    if (files && typeof files === 'object') {
      await Promise.all(
        Object.keys(files).map((filePath) => {
          const content = files[filePath];
          const resolvedPath = path.resolve(tempDir, filePath);
          if (typeof content === 'string') {
            return fs.outputFile(resolvedPath, content);
          } else {
            return fs.outputJson(resolvedPath, content);
          }
        })
      );
    }

    dirs.push(tempDir);
    return tempDir;
  };

  return { clean, initFixture };
}
