import {
  dependencyGraphFromWorkspace,
  garmentFromWorkspace,
  getProjectsByName,
} from '@garment/garment';
import log from '@garment/logger';
import { Project } from '@garment/workspace';
import chalk from 'chalk';
import * as yargs from 'yargs';
import { createWorkspace } from './utils/createWorkspace';
import isInteractive from './utils/isInteractive';
import { Status } from './utils/status';
import updateNotifier from './utils/updateNotifier';
import { getCacheConfig } from './utils/getCacheConfig';

interface CommonOptions {
  cmd?: string;
  project?: string;
  watch?: boolean;
  skipLifecycle?: boolean;
  stdin?: boolean;
  all?: boolean;
  files?: string[];
  projects?: string[];
  exclude?: string[];
  cache?: boolean;
}

const options: {
  [key: string]: yargs.Options;
} = {
  watch: {
    type: 'boolean',
    description: 'Activate watch mode',
  },
  skipLifecycle: {
    type: 'boolean',
    description: 'Prevent running pre- and post- lifecycle tasks',
  },
  all: {
    type: 'boolean',
    description: 'Run for all projects if none is provided',
  },
  projects: {
    type: 'array',
    description: 'Provide list of projects',
  },
  files: {
    type: 'array',
    description: 'Provide list of files',
  },
  stdin: {
    type: 'boolean',
    hidden: true, // TODO remove after action graph refactor
    description: 'Read project names from stdin',
  },
  exclude: {
    type: 'array',
    description: 'Projects to exclude from run',
  },
  cache: {
    type: 'boolean',
    description: 'Activate cache (--no-cache do deactivate)',
    default: true,
  },
};

const garmentOwnKeysSet = new Set([
  ...Object.keys(options),
  '_',
  'cmd',
  'project',
  'arg',
  'loglevel',
  'perf',
  '$0',
]);

async function handler(argv: CommonOptions) {
  const {
    cmd,
    files,
    watch,
    skipLifecycle,
    all,
    exclude = [],
    project: projectNameArg,
    projects: projectNamesArg,
    stdin: stdinArg,
    cache: shouldCache,
  } = argv;

  if (
    projectNameArg &&
    projectNameArg.search(/[*!]/) !== -1 &&
    exclude.length
  ) {
    throw new Error(`Can't use --exclude flag for a single project`);
  }

  const workspace = await createWorkspace();

  const {
    currentProject,
    config: { cache },
  } = workspace;

  const projectName = projectNameArg || currentProject?.name;

  if (!cmd || !workspace.taskNames.includes(cmd)) {
    throw `Specify one of available tasks: \n\n${workspace.taskNames.join(
      '\n'
    )}\n`;
  }

  const multiProjectFlags = [
    ['all', all],
    ['files', files],
    ['projects', projectNamesArg],
  ].filter(([, _]) => Boolean(_));

  if (multiProjectFlags.length > 1) {
    throw new Error(
      `Can't use ${multiProjectFlags
        .map(([name]) => `--${name}`)
        .join(', ')} flags together`
    );
  }
  if (multiProjectFlags.length === 1 && projectNameArg) {
    throw new Error(
      `Can't use --${multiProjectFlags[0][0]} flag together with a project name "${projectName}"`
    );
  }

  let projectNames = projectNamesArg
    ? projectNamesArg
    : projectName
    ? [projectName]
    : [];

  const garmentVersion = require('../package.json').version;

  console.log(chalk.bold(`🧤 Garment v${garmentVersion}`));
  console.log(updateNotifier());

  if (projectNameArg) {
  } else if (currentProject) {
    console.log(`Project is set to "${currentProject.name}"`);
  }

  if (stdinArg) {
    log.debug('Got project names from STDIN');
    const stdin = await readStdin();
    projectNames = stdin.trim().split(/\s+/).filter(Boolean);
  }

  const runnerOptions = extractRunnerOptions(argv);

  const dependencyGraph = dependencyGraphFromWorkspace(workspace);

  const projects = ((all || !projectName) && !projectNamesArg && !files
    ? [...workspace.projects].map((project) => ({ project, files: [] }))
    : getProjectsByName(workspace, files || projectNames, Boolean(files))
  ).filter(
    (item) =>
      !exclude.includes(item instanceof Project ? item.name : item.project.name)
  );

  const task = {
    name: cmd,
    projects,
    watch,
  };

  function clearLine(stream = process.stdout) {
    if (stream.isTTY) {
      stream.write('\x1b[999D\x1b[K');
    }
  }

  function clear(height: number) {
    process.stdout.write('\r\x1B[K\r\x1B[1A'.repeat(height));
  }

  let lastHeight = 0;

  const status = new Status(({ done, dynamic, height }) => {
    if (isInteractive) {
      if (lastHeight) {
        clear(lastHeight);
        clearLine();
      }
      lastHeight = height;
    }
    done.forEach((line) => console.log(line));
    if (isInteractive) {
      dynamic.forEach((line) => console.log(line));
    }
  });

  const cacheConfig = getCacheConfig(workspace);

  await garmentFromWorkspace({
    workspace,
    dependencyGraph,
    task,
    runnerOptions,
    skipLifecycle,
    cache: shouldCache ? cacheConfig : { type: 'off' },
    onUpdate(event) {
      if (event.type === 'before-action') {
        const { action } = event;
        status.actionStarted(action);
      } else if (event.type === 'action-done') {
        const { action, result } = event;
        status.actionFinished(action, result);
      } else if (event.type === 'action-skip') {
        const { action } = event;
        status.actionSkipped(action);
      } else if (event.type === 'all-actions') {
        status.reset();
        status.setActions(...event.actions);
      } else if (event.type === 'done') {
        status.flush();
      } else if (event.type === 'reset') {
        status.reset();
      } else if (event.type === 'before-batch') {
        status.batchStarted();
      } else if (event.type === 'batch-done') {
        status.batchFinished(event.result);
      }
    },
  });

  if (status.hasErrors && !watch) {
    throw new Error('One or more errors occured during runners execution');
  }
}

export function defaults(yargs: yargs.Argv) {
  return yargs
    .command(
      '$0 <cmd> [project]',
      'Run command',
      options,
      async (argv: any) => {
        await handler(argv);
      }
    )
    .command(
      'run <cmd> [project]',
      'Run command',
      options,
      async (argv: any) => {
        await handler(argv);
      }
    );
}

async function readStdin() {
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  let data = '';
  return new Promise<string>((resolve) => {
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
  });
}

function extractRunnerOptions(argv: any) {
  const filteredFlags = Object.keys(argv).filter(
    (key) => !garmentOwnKeysSet.has(key)
  );
  return filteredFlags.reduce(
    (obj, flag) => {
      const value = argv[flag];
      if (typeof value === 'object' && !Array.isArray(value)) {
        Object.keys(value)
          .filter((key) => key !== '--' && key.includes('-'))
          .forEach((key) => {
            delete value[key];
          });
        obj[flag] = value;
      } else {
        obj.global[flag] = value;
      }
      return obj;
    },
    { global: {} } as any
  );
}
