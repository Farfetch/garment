import {
  Context,
  defineRunner,
  defineWatch,
  Batch,
  defineOptionsFromJSONSchema
} from '@garment/runner';
import * as fs from 'fs-extra';
import * as Path from 'path';
import * as tempy from 'tempy';
import { Config } from '@jest/types';

const jestCLI = require('jest');

/**
 * Runs Jest
 * @example {
    "runner": "jest",
    "options": {
      "jestConfig": "jest.config.js"
    }
  }
 */
export interface BaseJestRunnerOpts {
  /**
   * The config file to load Jest's config from.
   * @format path
   * @default jest.config.js
   */
  configFile: string;

  testPathPattern?: string;
  updateSnapshot?: boolean;
  u?: boolean;
  _?: string | boolean;
}

export interface JestRunnerOptions extends BaseJestRunnerOpts {
  [key: string]: string | number | boolean | undefined;
}

export default defineRunner(
  defineOptionsFromJSONSchema<JestRunnerOptions>(require('./schema.json')),
  async ctx => {
    process.env.NODE_ENV = 'test';
    return jestCLI.run(await getJestArgs(ctx));
  }
);

export const watch = defineWatch(
  defineOptionsFromJSONSchema<JestRunnerOptions>(require('./schema.json')),
  async ctx => {
    process.env.NODE_ENV = 'test';
    return jestCLI.run([...(await getJestArgs(ctx)), '--watch']);
  }
);

async function getJestArgs(ctx: Context<JestRunnerOptions>) {
  const opts = ctx.options;
  const {
    _,
    testPathPattern = _,
    u,
    updateSnapshot = u,
    outputDir,
    configFile,
    ...rest
  } = opts;

  const jestConfig = await getConfig(ctx);

  const outputFilePath = tempy.file({ extension: 'json' });
  await fs.outputJSON(outputFilePath, jestConfig);

  const args = ['--config', outputFilePath];
  if (testPathPattern && testPathPattern !== true) {
    args.push('--testPathPattern', String(testPathPattern));
  }
  if (updateSnapshot) {
    args.push('--updateSnapshot');
  }

  const restArgs = Object.entries(rest)
    .map(([key, value]) => [`--${key}`, String(value)])
    .reduce((a, b) => [...a, ...b], []);

  args.push(...restArgs);

  ctx.logger.silly('jest config:\n', JSON.stringify(jestConfig, null, 2));
  ctx.logger.silly('jest args:\n', JSON.stringify(args, null, 2));
  ctx.logger.silly('temp config path:\n', outputFilePath);

  return args;
}

export async function getConfig(ctx: Context<JestRunnerOptions>) {
  const batch = [...ctx.batch()];

  const projsByConfig: {
    [key: string]: Batch<JestRunnerOptions>[];
  } = {};

  batch.forEach(item => {
    const { configFile } = item.options;

    if (!projsByConfig[configFile]) {
      projsByConfig[configFile] = [];
    }
    projsByConfig[configFile].push(item);
  });

  const projsKeys = Object.keys(projsByConfig);
  const isMultipleConfigs = projsKeys.length > 1;
  const jestConfig: Partial<Config.DefaultOptions> = {
    rootDir: ctx.workspace.cwd,
    projects: []
  };

  const configEntries = Object.entries(projsByConfig).map(
    ([configPath, items]) =>
      [
        configPath,
        require(configPath) as Partial<
          Config.DefaultOptions & Config.ProjectConfig
        >,
        items
      ] as const
  );

  const hasCollectCoverage = configEntries.some(([, config]) =>
    Boolean(config.collectCoverage)
  );

  for (const [configPath, projectConfig, items] of configEntries) {
    const rootDir = projectConfig.rootDir || Path.dirname(configPath);
    const roots = items.map(
      item => '<rootDir>/' + Path.relative(rootDir, item.project.fullPath)
    );
    projectConfig.rootDir = rootDir;
    projectConfig.roots = roots;

    if (isMultipleConfigs) {
      if (projectConfig.collectCoverage) {
        delete projectConfig.collectCoverage;
      } else if (hasCollectCoverage) {
        projectConfig.coveragePathIgnorePatterns = roots;
      }
    }

    if (isMultipleConfigs && jestConfig.projects) {
      if (projectConfig.projects && projectConfig.projects.length > 0) {
        const newProjects = projectConfig.projects as Config.ProjectConfig[];

        newProjects.forEach(project => {
          if (projectConfig.rootDir) {
            project.rootDir = projectConfig.rootDir;
          }
        });

        jestConfig.projects.push(...newProjects);
      } else {
        jestConfig.projects.push(projectConfig as Config.ProjectConfig);
      }
    } else {
      Object.assign(jestConfig, projectConfig);
    }
  }

  if (hasCollectCoverage) {
    jestConfig.collectCoverage = true;
  }

  return jestConfig;
}
