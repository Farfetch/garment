import { SchematicsClient } from '@garment/schematics-client';

interface InitOptions {
  from?: 'yarn' | 'lerna';
  withPreset?: string;
}

export async function run(options: InitOptions) {
  const { from, withPreset } = options;
  const schematicsClient = new SchematicsClient();

  schematicsClient.run({
    collectionName: '@garment/schematics-init',
    schematicName: 'init',
    options: {
      from,
      withPreset,
    },
  });
}
