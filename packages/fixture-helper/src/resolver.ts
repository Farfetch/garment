import * as globby from 'globby';
import * as Path from 'path';

interface ResolutionsByTestDir {
  [testDir: string]: Record<string, string>;
}

interface ResolverOptions {
  basedir: string;
  defaultResolver: (request: string, options: ResolverOptions) => string;
  extensions: string[];
  moduleDirectory: string[];
  paths: string[];
  rootDir: string[];
}

function testDirFromResolutionPath(resPath: string): string {
  return Path.normalize(Path.parse(resPath).dir);
}
function testDirFromBase(baseDir: string): string {
  return Path.join(baseDir, '../__tests__');
}

let mapping: ResolutionsByTestDir = {};

globby
  .sync([`**/__tests__/module-resolution.json`], {
    cwd: process.cwd(),
    absolute: true,
    ignore: ['node_modules', '.yarn', '.github', 'docs', 'private'],
  })
  .forEach((file) => {
    const testDir = testDirFromResolutionPath(file);
    mapping[testDir] = require(file);
  });

function resolver(path: string, options: ResolverOptions): string {
  const testDir = testDirFromBase(options.basedir);

  let actualResolution: string | null = null;

  if (mapping[testDir]) {
    const resolutionInFile = mapping[testDir][path];
    actualResolution = resolutionInFile && Path.join(testDir, resolutionInFile);
  }

  return actualResolution || options.defaultResolver(path, options);
}

module.exports = resolver;
