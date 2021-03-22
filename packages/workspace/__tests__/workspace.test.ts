import { getProjectsTasks } from '../src/Workspace';
import { Config } from '../src/Config';

describe('getProjectTasks', () => {
  const config: Config = {
    presets: {
      package: {
        tasks: {
          buildCSS: {
            runner: 'package-build-css'
          },
          build: [
            ':buildCSS',
            {
              runner: 'package-build'
            }
          ]
        }
      }
    },
    projects: {
      first: {
        path: 'projects/first',
        tasks: {
          clean: {
            runner: 'clean-first'
          },
          build: [
            ':clean',
            {
              runner: 'build'
            }
          ],
          prebuild: 'second:clean'
        }
      },
      second: {
        path: 'projects/second',
        extends: 'package',
        tasks: {
          clean: 'first:clean'
        }
      },
      third: {
        path: 'projects/third',
        tasks: {
          build: [
            {
              ref: 'first:build',
              next: [
                {
                  runner: 'build:foo'
                }
              ]
            }
          ]
        }
      },
      forth: {
        path: 'projects/forth',
        tasks: {
          prebuild: 'first:prebuild'
        }
      }
    }
  };

  test('resolves references to the same project task starting with ":"', () => {
    const taskDef = getProjectsTasks(config, 'first');

    expect(taskDef).toMatchSnapshot();
  });

  test('resolves tasks from preset and other project', () => {
    const taskDef = getProjectsTasks(config, 'second');

    expect(taskDef).toMatchSnapshot();
  });

  test('resolves tasks from preset and other project defined with ref', () => {
    const taskDef = getProjectsTasks(config, 'third');

    expect(taskDef).toMatchSnapshot();
  });

  test('throws ', () => {
    const taskDef = getProjectsTasks(config, 'forth');

    expect(taskDef).toMatchSnapshot();
  });
});
