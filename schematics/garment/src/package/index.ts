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
import { addProjectToGarmentJson } from '@garment/schematics-utils';

export interface PackageSchematicOptions {
  name: string;
  packageName?: string;
  directory: string;
  skipGarmentJson?: boolean;
}

export default function(options: PackageSchematicOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const { name, directory } = options;
    if (!options.name) {
      throw new SchematicsException('name option is required.');
    }
    if (!tree.getDir('.').subdirs.includes(directory as any)) {
      throw new SchematicsException(`Directory "${directory}" doesn't exist`);
    }

    const dashedName = strings.dasherize(name);
    const packagePath = Path.join(directory, dashedName);

    context.addTask(
      new NodePackageInstallTask({
        workingDirectory: packagePath,
        packageManager: 'yarn'
      })
    );

    let source = apply(url('../../templates/package'), [
      applyTemplates({
        packageName: dashedName,
        dot: '.',
        camelize: strings.camelize,
        dasherize: strings.dasherize
      }),
      move(packagePath)
    ]);

    return chain([
      mergeWith(source),
      addProjectToGarmentJson({
        garmentJsonPath: '/garment.json',
        name: dashedName,
        path: packagePath,
        extendProjects: ['tspackage']
      })
    ]);
  };
}
