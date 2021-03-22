import { CacheProvider } from '@garment/runner';
import * as fs from 'fs-extra';
import * as Path from 'path';

export class FileCache<T = any> implements CacheProvider {
  constructor(private cacheDirPath: string) {
    fs.ensureDirSync(cacheDirPath);
  }

  has(id: string) {
    return fs.existsSync(this.resolveIdPath(id));
  }

  get(id: string) {
    return fs.readJSONSync(this.resolveIdPath(id)) as T | undefined;
  }

  set(id: string, content: T) {
    fs.outputFileSync(this.resolveIdPath(id), JSON.stringify(content));
  }

  private resolveIdPath(id: string) {
    return Path.join(this.cacheDirPath, id);
  }
}
