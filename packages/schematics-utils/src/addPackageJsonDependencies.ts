import { Tree } from '@angular-devkit/schematics';
import { sortObject } from './sortObject';

export function addPackageJsonDependencies(
  targetPackageJsonPath: string,
  ...fromPackageJsonPaths: string[]
) {
  return (tree: Tree) => {
    const dependenciesMap: { [key: string]: string } = {};

    fromPackageJsonPaths.forEach((path) => {
      const depPackageJsonContent = tree.read(path);
      if (!depPackageJsonContent) {
        throw new Error(`Couldn't find ${path}`);
      }
      const workspacePackageJson = JSON.parse(
        depPackageJsonContent.toString('utf-8')
      );
      const { name, version } = workspacePackageJson;

      dependenciesMap[name] = `^${version}`;
    });

    const targetPackageJsonContent = tree.read(targetPackageJsonPath);
    if (!targetPackageJsonContent) {
      throw new Error(`Couldn't find ${targetPackageJsonPath}`);
    }
    const pluginPackageJson = JSON.parse(
      targetPackageJsonContent.toString('utf-8')
    );

    pluginPackageJson.dependencies = sortObject({
      ...pluginPackageJson.dependencies,
      ...dependenciesMap,
    });

    tree.overwrite(
      targetPackageJsonPath,
      JSON.stringify(pluginPackageJson, null, 2)
    );
  };
}
