import * as yargs from 'yargs';

const command = 'dep-graph';

const describe = 'Show projects dependency graph';

const builder = (yargs: yargs.Argv) => {
  return yargs.options({});
};

const handler = async () => {
  const { run } = await import('./depGraph');
  await run();
};

export { command, describe, builder, handler };
