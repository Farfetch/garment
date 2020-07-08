import * as yargs from 'yargs';

const command = 'cache [sub-command]';

const describe = 'Manage Garment cache';

const builder = (yargs: yargs.Argv) => {
  return yargs.options({});
};

const handler = async (argv: any) => {
  const { run } = await import('./cache');
  await run(argv);
};

export { command, describe, builder, handler };
