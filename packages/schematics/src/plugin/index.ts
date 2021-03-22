import { strings } from '@angular-devkit/core';
import {
  apply,
  applyTemplates,
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
import * as Path from 'path';
import {
  addProjectToGarmentJson,
  addPackageJsonDependencies
} from '@garment/schematics-utils';

export interface Options {
  name: string;
}

export default function(options: Options): Rule {
  return (_tree: Tree, context: SchematicContext) => {
    const { name } = options;
    if (!options.name) {
      throw new SchematicsException('name option is required.');
    }

    const directory = 'plugins';

    const dashedName = strings.dasherize(name);
    const projectName = dashedName;

    context.logger.info(`Creating project called "${projectName}"...`);

    const packagePath = Path.join(directory, projectName);

    context.addTask(
      new NodePackageInstallTask({
        workingDirectory: packagePath,
        packageManager: 'yarn'
      })
    );

    let source = apply(url('../../templates/plugin'), [
      applyTemplates({
        name,
        ...strings
      }),
      move(packagePath)
    ]);

    return chain([
      mergeWith(source),
      addPackageJsonDependencies(
        `${packagePath}/package.json`,
        'core/workspace/package.json'
      ),
      addProjectToGarmentJson({
        garmentJsonPath: '/garment.json',
        name: projectName,
        path: packagePath,
        extendProjects: ['tspackage']
      })
    ]);
  };
}
