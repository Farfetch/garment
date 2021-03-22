import * as yargs from 'yargs';

const command = 'generate [generatorName]';

const aliases = ['g'];

const describe = 'Run generator';

const builder = (yargs: yargs.Argv) => {
  return yargs.options({});
};

const handler = async (argv: any) => {
  const { run } = await import('./generate');
  await run(argv);
};

export { command, aliases, describe, builder, handler };
