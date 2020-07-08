import * as YeomanEnvironment from 'yeoman-environment';
import * as Path from 'path';
import * as globby from 'globby';
import * as fs from 'fs';

const lookups = ['./', 'generators', 'lib/generators/'];

export class YeomanClient {
  env: YeomanEnvironment;

  constructor(private generators: string[], cwd: string) {
    this.env = YeomanEnvironment.createEnv([], { cwd });

    for (const generator of generators) {
      const generatorDir = './'.includes(generator[0])
        ? generator
        : Path.dirname(require.resolve(Path.join(generator, 'package.json')));
      const [, namespace = undefined] =
        generator.match(/generator-(\w*)/) || [];

      const patterns = lookups
        .map(lookup => Path.join(generatorDir, lookup))
        .filter(path => fs.existsSync(path));

      for (const pattern of patterns) {
        const files = globby.sync('*/index.js', {
          cwd: pattern,
          absolute: true
        });
        files.forEach(file => this.tryRegister(file, namespace));
      }
    }
  }

  list() {
    return Object.keys(this.env.getGeneratorsMeta());
  }

  run(name: string, options: any = {}) {
    return new Promise((resolve, reject) => {
      this.env.run(name, options, err => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }

  private tryRegister(filename: string, namespace?: string) {
    const realpath = fs.realpathSync(filename);
    this.env.register(
      realpath,
      (namespace ? namespace + ':' : '') + Path.basename(Path.dirname(realpath))
    );
  }
}
