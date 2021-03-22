import { Rule, Tree } from '@angular-devkit/schematics';
import * as execa from 'execa';
import * as Path from 'path';

export interface Options {
  from?: 'yarn' | 'lerna';
  withPreset?: string;
}

export default function(options: Options): Rule {
  return (tree: Tree, _context) => {
    const garmentJson = {
      $schema: './node_modules/@garment/workspace/schemas/config.schema.json',
      presets: {} as { [key: string]: any },
      projects: {} as { [key: string]: any },
      schematics: []
    };

    const cwd = process.cwd();

    if (options.withPreset) {
      garmentJson.presets[options.withPreset] = {
        tasks: {}
      };
    }

    if (options.from === 'yarn') {
      const { stdout } = execa.sync('yarn', ['workspaces', 'info'], { cwd });
      const yarnWorkspaces = JSON.parse(stdout) as {
        [key: string]: { location: string };
      };
      for (const value of Object.values(yarnWorkspaces)) {
        const projectName = Path.basename(value.location);
        garmentJson.projects[projectName] = {
          path: value.location,
          ...(options.withPreset && { extends: [options.withPreset] })
        };
      }
    } else if (options.from === 'lerna') {
      const { stdout } = execa.sync('lerna', ['list', '-p'], { cwd });
      const lernaProjects = stdout.trim().split(/\s+/);
      for (const path of lernaProjects) {
        const projectName = Path.basename(path);
        garmentJson.projects[projectName] = {
          path: Path.relative(cwd, path),
          ...(options.withPreset && { extends: [options.withPreset] })
        };
      }
    }

    tree.create('garment.json', JSON.stringify(garmentJson, null, 2));
  };
}
