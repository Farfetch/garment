import { Workspace } from '@garment/workspace';
import * as cosmiconfig from 'cosmiconfig';
import * as Path from 'path';

export async function createWorkspace() {
  const moduleName = 'garment';
  const searchPlaces = [
    'package.json',
    `${moduleName}.json`,
    `${moduleName}.yaml`,
    `${moduleName}.config.js`,
  ];
  const explorer = cosmiconfig(moduleName, { searchPlaces });
  const result = await explorer.search();
  if (result) {
    const cwd = Path.dirname(result.filepath);

    const workspace = Workspace.create(result.config as any, { cwd });

    const currentCwd = process.cwd();
    if (currentCwd !== cwd) {
      workspace.currentProject = workspace.projects.getByPathExact(currentCwd);
    }

    return workspace;
  } else {
    throw new Error('No configuration file found');
  }
}
