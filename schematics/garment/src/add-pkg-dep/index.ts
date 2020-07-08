import { chain, Rule, Tree } from '@angular-devkit/schematics';
import { Project, Workspace } from '@garment/workspace';
import * as Path from 'path';
import { sortObject } from '@garment/schematics-utils';

export interface Options {
  name: string;
  getWorkspace?: () => Workspace;
  project: string;
  dep: string;
  dev?: boolean;
}

function addDependency(
  workspace: Workspace,
  projectName: string,
  depName: string,
  dev: boolean
) {
  const { projects } = workspace;

  let from: Project | undefined;
  let to: Project['nodePackage'];

  for (const project of projects) {
    const { nodePackage } = project;
    if (
      !from &&
      (project.name === projectName ||
        (nodePackage && nodePackage.name === projectName))
    ) {
      from = project;
    }
    if (
      !to &&
      (project.name === depName ||
        (nodePackage && nodePackage.name === depName))
    ) {
      if (!nodePackage) {
        throw new Error(`Dependency project "${depName}" is not node package`);
      }
      to = nodePackage;
    }
  }

  return (tree: Tree) => {
    if (!from) {
      throw new Error(`Couldn't find project "${projectName}"`);
    }
    if (!to) {
      throw new Error(`Couldn't find project "${depName}"`);
    }

    const depField = dev ? 'devDependencies' : 'dependencies';

    const packageJsonPath = Path.join(from.path, 'package.json');
    const packageJsonContent = tree.read(packageJsonPath)!.toString();
    const packageJson = JSON.parse(packageJsonContent);

    const dependencies = sortObject({
      ...(packageJson[depField] || {}),
      [to.name]: `^${to.version}`
    });

    packageJson[depField] = dependencies;

    tree.overwrite(packageJsonPath, JSON.stringify(packageJson, null, 2));
  };
}

export default function(options: Options): Rule {
  return () => {
    if (!options.getWorkspace) {
      return;
    }
    const { project, dep, dev = false } = options;
    if (!project) {
      throw new Error('Provide project name');
    }
    if (!dep) {
      throw new Error('Provide dependency name');
    }
    const workspace = options.getWorkspace();

    return chain([addDependency(workspace, project, dep, dev)]);
  };
}
