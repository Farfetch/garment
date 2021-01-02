import { Project } from './Project';

import normalizePath = require('normalize-path');
import { isSubPath } from './isSubpath';

export class ProjectRegistry {
  [Symbol.iterator]() {
    return this._projects.values();
  }

  private _projects = new Map<string, Project>();

  get projectNames() {
    return Array.from(this._projects.keys());
  }

  add(name: string, project: Project) {
    this._projects.set(name, project);
  }

  get(name: string) {
    return this._projects.get(name);
  }

  has(name: string) {
    return this._projects.has(name);
  }

  list() {
    return Array.from(this);
  }

  getByPaths(...paths: string[]) {
    paths = paths.map(path => normalizePath(path));
    return this.list().filter(project =>
      paths.some(path => isSubPath(project.fullPath, path))
    );
  }

  getByPath(path: string) {
    path = normalizePath(path);
    return this.list().find(project => isSubPath(project.fullPath, path));
  }

  getByPathExact(path: string) {
    path = normalizePath(path);
    return this.list().find(project => path === project.fullPath);
  }
}
