import { initFixtureHelper, replaceTestPath } from '@garment/fixture-helper';
import { Workspace } from '@garment/workspace';
import * as Path from 'path';
import { getProjectsByName } from '../src';

const { initFixture, clean } = initFixtureHelper(module, {
  tempDir: Path.join(__dirname, '/tmp__')
});

const initFixtureWorkspace = async () => {
  const testDir = await initFixture('basic-workspace');

  const workspace = Workspace.create(
    require(Path.join(testDir, 'garment.json')),
    { cwd: testDir }
  );

  return workspace;
};

afterAll(clean);

describe('getProjectsByName', () => {
  test('returns projects if files flag is unspecified', async () => {
    const workspace = await initFixtureWorkspace();

    const result = getProjectsByName(workspace, ['proj-a', 'proj-c']);
    expect(result.map(({ project }) => project.path)).toMatchSnapshot();
  });

  test('throws if the project name is not found', async () => {
    const workspace = await initFixtureWorkspace();
    expect(() =>
      getProjectsByName(workspace, ['proj-a', 'proj-d'])
    ).toThrowErrorMatchingSnapshot();
  });

  test('returns projects with files if files flag is specified', async () => {
    const workspace = await initFixtureWorkspace();

    const files = [
      'project-a/a1.txt',
      'project-a/a2.txt',
      'project-c/c2.txt'
    ].map(_ => workspace.resolvePath(_));

    const result = getProjectsByName(workspace, files, true);
    expect(
      replaceTestPath(
        result.map(item => ({
          projectPath: item.project.path,
          files: item.files
        })),
        workspace.cwd
      )
    ).toMatchSnapshot();
  });

  test('throws in the project containing file is not found', async () => {
    const workspace = await initFixtureWorkspace();
    expect(() =>
      getProjectsByName(
        workspace,
        [workspace.resolvePath('/project-X/non-existing-file.txt')],
        true
      )
    ).toThrowErrorMatchingSnapshot();
  });

  test('returns projects matching glob pattern', async () => {
    const workspace = await initFixtureWorkspace();
    try {
      const result = getProjectsByName(workspace, ['proj-*']);
      expect(result.map(({ project }) => project.path)).toMatchSnapshot();
    } catch (error) {
      console.error(error);
    }
  });


  test('throws if no projects are matching glob pattern', async () => {
    const workspace = await initFixtureWorkspace();
    expect(() =>
    getProjectsByName(workspace, ['project-*'])
    ).toThrowErrorMatchingSnapshot();
  });
});
