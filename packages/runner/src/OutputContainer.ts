import { Level, Logger } from '@garment/logger';
import { File } from './types';
import { createHash } from 'crypto';
import * as Path from 'path';

export interface CacheProvider<T = any> {
  has(id: string): Promise<boolean> | boolean;
  get(id: string): Promise<T> | T;
  set(id: string, content: T): Promise<void> | void;
}
export interface LogEntry {
  level: Level;
  content: any[];
  scope: string;
}

export class OutputContainer {
  static isOutputContainer(obj: any): obj is OutputContainer {
    return (<OutputContainer>obj)?.isOutputContainer ?? false;
  }

  private readonly isOutputContainer = true;

  logger: Logger;
  logs: LogEntry[] = [];
  dependencies: string[];
  files: File[] = [];
  hash: string;
  target: string;

  targetBaseDir: string;

  constructor(
    public readonly cacheProvider: CacheProvider,
    target: string | File,
    public readonly cacheKeys: string[],
    dependencies: (string | File)[] = []
  ) {
    const hash = createHash('md5');
    for (const cacheKey of this.cacheKeys) {
      hash.update(JSON.stringify(cacheKey));
    }
    this.hash = hash.digest('hex');

    if (typeof target === 'string') {
      this.target = target;
      this.targetBaseDir = Path.dirname(target);
    } else {
      this.target = target.absolutePath ?? target.path;
      this.targetBaseDir = target.baseDir ?? Path.dirname(this.target);
    }

    this.dependencies = dependencies.map((dep) =>
      typeof dep === 'string' ? dep : dep.absolutePath ?? dep.path
    );

    this.logger = new Logger('', '', 'silly');
    this.logger.interceptors.push(({ level, args }) => {
      this.logs.push({
        level,
        content: args,
        scope: '    ',
      });
      return false; // creating logger instance which doesn't output to the console
    });
  }

  add(file: File) {
    this.files.push(file);
  }

  get isNotCached() {
    return !this.cacheProvider.has(this.hash);
  }

  async syncWithCache() {
    if (await this.cacheProvider.has(this.hash)) {
      const cacheEntry = await this.cacheProvider.get(this.hash);
      if (cacheEntry) {
        this.files = cacheEntry.output;
        this.logs = cacheEntry.logs;
      }
    } else {
      await this.cacheProvider.set(this.hash, {
        logs: this.logs,
        output: this.files,
      });
    }
  }

  toJSON() {
    const { cacheKeys, dependencies, logs, files } = this;
    return {
      cacheKeys,
      dependencies,
      logs,
      files,
    };
  }

  hasErrorsOrWarnings() {
    return this.logs.some(
      (entry) => entry.level === 'error' || entry.level === 'warn'
    );
  }
}
