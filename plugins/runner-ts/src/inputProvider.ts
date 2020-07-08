import { TSRunnerOptions } from './index';
// eslint-disable-next-line node/no-extraneous-import
import { Project } from '@garment/workspace';
import * as fs from 'fs';
import * as Path from 'path';

export default (project: Project, options: TSRunnerOptions) => {
  const { configFile } = options;

  const {
    include = [],
    exclude = [],
    files = [],
    compilerOptions: { rootDir = '', allowJs = false } = {}
  } = JSON.parse(fs.readFileSync(configFile, 'utf8')) as {
    include?: string[];
    exclude?: string[];
    files?: string[];
    compilerOptions?: any;
  };

  const defaultInclude = ['*.ts', '*.tsx', '*.d.ts'];
  if (allowJs) {
    defaultInclude.push('*.js', '*.jsx');
  }

  let resultInclude = [];
  if (include.length) {
    for (const pattern of include) {
      if (pattern.includes('*')) {
        if (pattern.endsWith('**')) {
          resultInclude.push(...defaultInclude.map(_ => Path.join(pattern, _)));
        } else if (pattern.endsWith('.*')) {
          resultInclude.push(
            ...defaultInclude.map(([, _]) => pattern.replace(/\.\*$/, _))
          );
        } else if (pattern.endsWith('*')) {
          resultInclude.push(
            ...defaultInclude.map(_ => pattern.replace(/\*$/, _))
          );
        } else {
          resultInclude.push(pattern);
        }
      } else {
        resultInclude.push(...defaultInclude.map(_ => Path.join(pattern, _)));
      }
    }
  } else {
    resultInclude = defaultInclude.map(_ => `**/${_}`);
  }

  const resultInput = {
    rootDir: Path.resolve(project.fullPath, rootDir),
    include: resultInclude,
    exclude,
    files: files.map(filePath => Path.resolve(rootDir, filePath))
  };

  return resultInput;
};
