import { dependencyGraphFromWorkspace } from '@garment/garment';
import { vizualizeGraph } from '@garment/visualize-graph';
import { createWorkspace } from '../../utils/createWorkspace';
import { getActionGraph } from '@garment/scheduler';

interface ActionGraphCommandOptions {
  task: string;
  projects: string[];
}

export async function run(options: ActionGraphCommandOptions) {
  const { task, projects: projectNames = [] } = options;

  const workspace = await createWorkspace();
  const dependencyGraph = dependencyGraphFromWorkspace(workspace);

  const projects = projectNames.length
    ? projectNames.map(projectName => {
        const project = workspace.projects.get(projectName);
        if (!project) {
          throw new Error(`Project "${projectName}" does not exist`);
        }
        return project;
      })
    : [...workspace.projects];

  const actionGraph = getActionGraph({
    workspace,
    dependencyGraph,
    task: {
      name: task,
      projects: projects.map(project => ({ project, files: [] }))
    },
    lifecycle: true
  });

  vizualizeGraph(actionGraph, {
    getNodeContent: ({ id, task, runner, project, options }) =>
      [
        `${runner.name}`,
        `task: ${task}`,
        `id: ${id}`,
        `proj: ${project.name}`,
        `opts: ${options.delay}`
      ].join('\n')
  });
}
