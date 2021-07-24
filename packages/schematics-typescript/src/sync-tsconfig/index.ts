import { chain, Rule, Tree } from '@angular-devkit/schematics';
import { dependencyGraphFromWorkspace } from '@garment/garment';
import { Project, Workspace } from '@garment/workspace';
import * as Path from 'path';

export interface Options {
  name: string;
  getWorkspace?: () => Workspace;
}

function syncTsConfigs(
  workspace: Workspace,
  baseTsConfigPath: string,
  projectName?: string
) {
  const { projects } = workspace;
  const dependencyGraph = dependencyGraphFromWorkspace(workspace);

  const tsConfigs: { path: string; config: any; merge?: boolean }[] = [];

  const checkProject = (project: Project) =>
    project.extendsSet.has('tspackage');

  for (const project of projects) {
    if (
      !checkProject(project) ||
      (projectName && project.name !== projectName)
    ) {
      continue;
    }
    const dependencies = dependencyGraph.getDirectDependenciesOf(project);

    const tsConfig = {
      path: project.path,
      config: {
        extends: Path.relative(project.fullPath, baseTsConfigPath),
        compilerOptions: {
          rootDir: 'src',
          outDir: 'lib',
          composite: true,
        },
        exclude: ['node_modules', 'lib', '__tests__'],
        references: Array.from(dependencies)
          .filter(checkProject)
          .map((depProject) => ({
            path: Path.relative(project.fullPath, depProject.fullPath),
          })),
      },
    };

    tsConfigs.push(tsConfig);
  }

  tsConfigs.push({
    path: '.',
    config: {
      files: [],
      references: Array.from(projects)
        .filter(checkProject)
        .map((_) => ({ path: _.path })),
    },
  });

  return (tree: Tree) => {
    for (const { path, config } of tsConfigs) {
      const configPath = Path.join(path, 'tsconfig.json');
      const content = JSON.stringify(config, null, 2);
      if (tree.exists(configPath)) {
        tree.overwrite(configPath, content);
      } else {
        tree.create(configPath, content);
      }
    }
  };
}

export default function (options: Options): Rule {
  return () => {
    if (!options.getWorkspace) {
      throw new Error('getWorkspace option is missing');
      return;
    }
    const workspace = options.getWorkspace();

    const baseTsConfigPath = Path.join(workspace.cwd, 'tsconfig.base.json');

    return chain([syncTsConfigs(workspace, baseTsConfigPath, options.name)]);
  };
}
