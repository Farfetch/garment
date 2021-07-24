import { strings } from '@angular-devkit/core';
import {
  apply,
  chain,
  mergeWith,
  Rule,
  SchematicsException,
  Tree,
  url,
  move,
} from '@angular-devkit/schematics';
import { addPackageJsonDependencies } from '@garment/schematics-utils';
import * as Path from 'path';
import { applyTemplates } from '../utils/applyTemplates';

export interface PackageSchematicOptions {
  projectName: string;
}

export default function (options: PackageSchematicOptions): Rule {
  return (_tree: Tree) => {
    let { projectName } = options;

    if (!projectName) {
      throw new SchematicsException('projectName option is required.');
    }

    const { projects } = readJson(_tree, 'garment.json');

    if (!projects[projectName]) {
      throw new SchematicsException(
        `Couldn't find project ${projectName} in garment.json`
      );
    }

    const packagePath = projects[projectName].path;

    let source = apply(url('../../templates/runner/__tests__'), [
      applyTemplates(
        {
          dot: '.',
          ...strings,
        },
        { interpolationStart: '___', interpolationEnd: '___' }
      ),
      move(Path.join(packagePath, '__tests__')),
    ]);

    return chain([
      mergeWith(source),
      addPackageJsonDependencies(
        `${packagePath}/package.json`,
        'utils/fixture-helper/package.json'
      ),
    ]);
  };
}

function readJson(tree: Tree, filePath: string) {
  const fileJsonContent = tree.read(filePath);
  if (!fileJsonContent) {
    throw new Error(`"${filePath}" is not found`);
  }
  return JSON.parse(fileJsonContent.toString('utf-8'));
}
