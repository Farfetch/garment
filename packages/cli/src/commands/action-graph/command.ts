import * as yargs from 'yargs';

const command = 'action-graph <task> [projects...]';

const describe = 'Show project task action graph';

const builder = (yargs: yargs.Argv) => {
  return yargs.options({});
};

const handler = async (argv: any) => {
  const { run } = await import('./actionGraph');
  await run(argv);
};

export { command, describe, builder, handler };
