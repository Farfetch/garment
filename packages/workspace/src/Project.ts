import { Hash } from 'crypto';
import * as Mustache from 'mustache';
import * as Path from 'path';
import { ResolvedTaskConfig } from './Config';
import { NodePackage } from './NodePackage';

(Mustache as any).escape = (text: string) => text;

type Constructor<T> = new (...args: any[]) => T;

class ClassMap extends Map<Constructor<any>, any> {
  get<T>(key: Constructor<T>): T | undefined {
    return super.get(key);
  }
  set<T>(key: Constructor<T>, value: T) {
    return super.set(key, value);
  }
}

export class Project {
  readonly types = new ClassMap();

  readonly name: string;
  readonly path: string;
  readonly fullPath: string;
  readonly tasks: { [name: string]: ResolvedTaskConfig };
  readonly extendsSet: Set<string>;
  readonly dependecies: string[];

  nodePackage?: NodePackage;

  constructor(options: {
    readonly name: string;
    readonly path: string;
    readonly fullPath: string;
    readonly tasks: { [name: string]: ResolvedTaskConfig };
    readonly dependencies: string[];
    readonly extendsSet: Set<string>;
  }) {
    const { name, path, fullPath, tasks, dependencies, extendsSet } = options;
    this.name = name;
    this.path = path;
    this.fullPath = fullPath;
    this.tasks = tasks;
    this.extendsSet = extendsSet;
    this.dependecies = dependencies;
  }

  get aliases() {
    const aliases = new Set<string>();
    for (const [, type] of this.types) {
      if (typeof type.getAlias === 'function') {
        aliases.add(type.getAlias());
      }
    }
    return aliases;
  }

  resolvePath(...path: string[]) {
    return Path.resolve(this.fullPath, ...path);
  }

  resolvePathTemplate(pathTemplate: string = '') {
    return Mustache.render(pathTemplate, {
      projectDir: this.fullPath,
      projectName: this.name
    });
  }

  updateHash(hash: Hash) {
    hash.update(this.name).update(this.path);
    for (const type of this.types.values()) {
      if (typeof type.updateHash === 'function') {
        type.updateHash(hash);
      }
    }
  }
}
