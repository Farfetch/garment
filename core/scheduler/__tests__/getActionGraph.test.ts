import {
  dependencyGraphFromWorkspace,
  getProjectsByName
} from '@garment/garment'; // eslint-disable-line
import { Project, Workspace } from '@garment/workspace';
import * as Path from 'path';
import { getActionGraph } from '../src';

test.skip(`actionGraph doesn't have circular dependencies`, async () => {
  const cwd = Path.join(__dirname + '/fixtures/basic');
  const workspace = Workspace.create(require(Path.join(cwd, 'garment.json')), {
    cwd
  });
  const dependencyGraph = dependencyGraphFromWorkspace(workspace);

  const [app, utils] = getProjectsByName(workspace, [
    'app',
    'utils'
  ]) as Project[];

  const actionGraph = getActionGraph({
    workspace,
    dependencyGraph,
    task: {
      name: 'build',
      projects: [
        {
          project: utils,
          files: [__dirname + '/fixtures/basic/packages/utils/foo.txt']
        },
        ...dependencyGraph.getDependantsOf(utils)
      ]
    }
  });

  // expect(actionGraph).toMatchSnapshot();
});
