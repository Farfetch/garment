import { chain, Rule, Tree } from '@angular-devkit/schematics';
import { Workspace } from '@garment/workspace';
import * as Path from 'path';

export interface Options {
  name: string;
  getWorkspace?: () => Workspace;
  field: string;
  value: string;
  projects: string;
  merge: boolean;
}

function syncPackageJson(
  workspace: Workspace,
  field: string,
  value: string,
  projectNames: string[],
  merge: boolean
) {
  const { projects } = workspace;

  let parsedValue: any = value;
  try {
    parsedValue = JSON.parse(value);
  } catch (e) {}

  return (tree: Tree) => {
    for (const project of projects) {
      if (projectNames.length && !projectNames.includes(project.name)) {
        continue;
      }
      const packageJsonPath = Path.join(project.path, 'package.json');
      const packageJsonContent = tree.read(packageJsonPath)!.toString();
      const packageJson = JSON.parse(packageJsonContent);
      let newValue = parsedValue;
      if (merge) {
        const originalValue = packageJson[field];
        if (Array.isArray(originalValue) && Array.isArray(parsedValue)) {
          newValue = [...originalValue, ...parsedValue];
        } else if (
          typeof originalValue === 'object' &&
          typeof parsedValue === 'object'
        ) {
          newValue = {
            ...originalValue,
            ...parsedValue
          };
        }
      }
      packageJson[field] = newValue;
      tree.overwrite(packageJsonPath, JSON.stringify(packageJson, null, 2));
    }
  };
}

export default function(options: Options): Rule {
  return () => {
    if (!options.getWorkspace) {
      return;
    }
    const { field, value, projects, merge } = options;
    if (!field) {
      throw new Error('Provide field name');
    }
    if (!value) {
      throw new Error('Provide value');
    }
    const workspace = options.getWorkspace();
    const projectNames = projects.split(',').map(_ => _.trim());

    return chain([
      syncPackageJson(workspace, field, value, projectNames, Boolean(merge))
    ]);
  };
}
