import { strings } from '@angular-devkit/core';
import {
  apply,
  chain,
  mergeWith,
  move,
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  url
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import {
  addPackageJsonDependencies,
  addProjectToGarmentJson
} from '@garment/schematics-utils';
import * as Path from 'path';
import { applyTemplates } from '../utils/applyTemplates';

export interface PackageSchematicOptions {
  name: string;
  packageName?: string;
  directory: string;
  skipGarmentJson?: boolean;
}

export default function(options: PackageSchematicOptions): Rule {
  return (_tree: Tree, context: SchematicContext) => {
    const { name } = options;

    if (!options.name) {
      throw new SchematicsException('name option is required.');
    }

    const directory = 'plugins';

    const dashedName = strings.dasherize(name);
    const projectName = 'runner-' + dashedName;

    const packagePath = Path.join(directory, projectName);

    context.addTask(
      new NodePackageInstallTask({
        workingDirectory: packagePath,
        packageManager: 'yarn'
      })
    );

    let source = apply(url('../../templates/runner'), [
      applyTemplates(
        {
          name,
          dot: '.',
          ...strings
        },
        { interpolationStart: '___', interpolationEnd: '___' }
      ),
      move(packagePath)
    ]);

    return chain([
      mergeWith(source),
      addPackageJsonDependencies(
        `${packagePath}/package.json`,
        'core/runner/package.json',
        'utils/fixture-helper/package.json'
      ),
      addProjectToGarmentJson({
        garmentJsonPath: '/garment.json',
        name: projectName,
        path: packagePath,
        extendProjects: ['tspackage', 'copy-other-files']
      })
    ]);
  };
}
