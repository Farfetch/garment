import { Project, Workspace } from '@garment/workspace';
import * as matcher from 'matcher';

import isValidPath = require('is-valid-path');

export function getProjectsByName(
  workspace: Workspace,
  projectNames: string[],
  files?: boolean
) {
  const { projects } = workspace;
  const filesByProject = new Map<Project, string[]>();
  if (files) {
    projectNames.forEach((path) => {
      const project = projects.getByPath(path);
      if (!project) {
        throw new Error(`Project containing file "${path}" was not found`);
      }
      if (!filesByProject.has(project)) {
        filesByProject.set(project, []);
      }
      filesByProject.get(project)!.push(path);
    });
  } else {
    const workspaceProjectNames = projects.projectNames;
    projectNames.forEach((projectName) => {
      if (projectName.search(/[*!]/) !== -1) {
        const matchedProjects = matcher(workspaceProjectNames, [projectName]);
        if (matchedProjects.length) {
          matchedProjects
            .map((_) => projects.get(_)!)
            .forEach((project) => {
              filesByProject.set(project, []);
            });
        } else {
          throw new Error(`Projects matching "${projectName}" were not found`);
        }
      } else {
        let project = projects.get(projectName);
        if (!project && isValidPath(projectName)) {
          project = projects.getByPathExact(workspace.resolvePath(projectName));
        }
        if (project) {
          filesByProject.set(project, []);
        } else {
          throw new Error(`Project with path "${projectName}" was not found`);
        }
      }
    });
  }
  return [...filesByProject.entries()].map(([project, files]) => ({
    project,
    files,
  }));
}
