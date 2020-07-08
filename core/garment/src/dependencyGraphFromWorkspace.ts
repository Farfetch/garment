import { Project, Workspace } from '@garment/workspace';
import { Graph } from '@garment/dependency-graph';

export function dependencyGraphFromWorkspace(workspace: Workspace) {
  const dependencyGraph = new Graph<Project>();

  workspace.projects
    .list()
    .forEach(project => dependencyGraph.addNode(project));

  // From garment.json
  workspace.projects.list().forEach(project => {
    project.dependecies.forEach(depName => {
      const depProject = workspace.projects.get(depName);
      if (depProject) {
        dependencyGraph.addDependency(project, depProject);
      } else {
        throw new Error(
          `Can't find dependency of the project "${project.name}" called "${depName}"`
        );
      }
    });
  });

  // From package.json
  const packageToProjectMap = new Map<string, Project>();
  const nodeProjects = workspace.projects
    .list()
    .filter(project => project.nodePackage)
    .map(project => {
      return {
        name: project.name,
        project,
        nodePackage: project.nodePackage!
      };
    });

  for (const { project, nodePackage } of nodeProjects) {
    packageToProjectMap.set(nodePackage.name, project);
  }

  for (const { project, nodePackage } of nodeProjects) {
    for (const dep of nodePackage.allDependencies.keys()) {
      const depProjectName = packageToProjectMap.get(dep);
      if (depProjectName) {
        dependencyGraph.addDependency(project, depProjectName);
      }
    }
  }

  return dependencyGraph;
}
