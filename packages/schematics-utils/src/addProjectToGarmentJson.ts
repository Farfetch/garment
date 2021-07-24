import { Rule, Tree } from '@angular-devkit/schematics';
import { Config, ProjectConfig } from '@garment/workspace';
import * as prettier from 'prettier';

export function addProjectToGarmentJson(options: {
  garmentJsonPath: string;
  name: string;
  path: string;
  extendProjects?: string[];
}): Rule {
  const { garmentJsonPath, name, path, extendProjects } = options;
  return (tree: Tree) => {
    const garmentJsonContent = tree.read(garmentJsonPath);
    if (!garmentJsonContent) {
      throw new Error(`"${garmentJsonPath}" is not found`);
    }
    const garmentJson: Config = JSON.parse(
      garmentJsonContent.toString('utf-8')
    );

    const project: { path: string; extends?: string[] } = {
      path,
    };
    if (extendProjects) {
      project.extends = extendProjects;
    }

    garmentJson.projects = {
      ...garmentJson.projects,
      [name]: project,
    };

    const sortedProjects: { [key: string]: ProjectConfig } = {};
    Array.from(Object.entries<{ path: string }>(garmentJson.projects))
      .sort(([, { path: pathA }], [, { path: pathB }]) =>
        pathA < pathB ? -1 : pathA > pathB ? 1 : 0
      )
      .forEach(([key, value]) => {
        sortedProjects[key] = value;
      });

    garmentJson.projects = sortedProjects;

    tree.overwrite(
      garmentJsonPath,
      prettier.format(JSON.stringify(garmentJson, null, 2), {
        parser: 'json',
      })
    );
  };
}
