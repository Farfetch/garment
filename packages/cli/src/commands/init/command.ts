import * as yargs from 'yargs';

const command = 'init';

const describe = 'Initialize Garment workspace';

const builder = (yargs: yargs.Argv) => {
  return yargs.options({
    from: {
      description: 'Get projects from Yarn or Lerna',
      choices: ['yarn', 'lerna'],
    },
    'with-preset': {
      description: 'Make each project extend given preset',
      type: 'string',
    },
  });
};

const handler = async (argv: any) => {
  const { run } = await import('./init');
  await run(argv);
};

export { command, describe, builder, handler };
