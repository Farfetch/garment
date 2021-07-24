import { printTree } from '@garment/print-tree';
import { SchematicsClient } from '@garment/schematics-client';
import { YeomanClient } from '@garment/yeoman-client';
import { createWorkspace } from '../../utils/createWorkspace';

interface GenerateCommandOptions {
  _: string[];
  generatorName: string;
}

export async function run(argv: GenerateCommandOptions) {
  const workspace = await createWorkspace();
  const schematics = workspace.config.schematics || [];
  const yeomans = workspace.config.yeomanGenerators || [];

  const { generatorName, ...runOptions } = argv;

  async function runSchematics(
    schematicsName: string,
    options: typeof runOptions
  ) {
    const { _, ...restOptions } = options;
    const schematicsClient = new SchematicsClient();

    let { collection, schematic } = schematicsClient.parseSchematicName(
      schematicsName
    );

    if (!collection) {
      const nameToCollectionMap = new Map<string, Set<string>>();
      for (const collection of schematics) {
        const list = schematicsClient.list(collection);
        for (const schematicsName of list) {
          if (!nameToCollectionMap.has(schematicsName)) {
            nameToCollectionMap.set(schematicsName, new Set());
          }
          nameToCollectionMap.get(schematicsName)!.add(collection);
        }
      }
      const collections = nameToCollectionMap.get(schematic);
      if (!collections) {
        throw new Error(`Schematics with a name "${schematic}" is not found`);
      }
      if (collections.size > 1) {
        throw new Error(
          `Schematics with a name "${schematic}" is found in multiple collections: "${collections}"`
        );
      }
      collection = [...collections.values()][0];
    }
    if (!collection) {
      return;
    }
    schematicsClient.run({
      collectionName: collection,
      schematicName: schematic,
      argv: _.slice(1),
      options: {
        ...restOptions,
        getWorkspace: () => workspace,
      },
    });
  }

  async function runYeoman(generatorName: string, options: typeof runOptions) {
    const { _, ...restOptions } = options;
    const yeomanClient = new YeomanClient(yeomans, workspace.cwd);
    yeomanClient.run(generatorName, restOptions);
  }

  async function showSchematicsList() {
    const schematicsClient = new SchematicsClient();
    for (const collection of schematics) {
      const list = schematicsClient.list(collection);
      console.log(`Collection "${collection}"`);
      console.log(printTree(list));
    }
  }

  async function showYeomanList() {
    const yeomanClient = new YeomanClient(yeomans, workspace.cwd);
    const list = yeomanClient.list();
    console.log(`Yeoman Generators`);
    console.log(printTree(list));
  }

  if (generatorName) {
    if (schematics.length && yeomans.length) {
      const [prefix, name] = generatorName.split(/:(.+)/).filter(Boolean);
      if (prefix === 'ng') {
        runSchematics(name, runOptions);
      } else if (prefix === 'yo') {
        runYeoman(name, runOptions);
      } else {
        throw new Error(
          'Garment configuration contains both Angular Schematics and Yeoman generators. In this case you must use "ng:" or "yo:" prefix.'
        );
      }
    } else if (schematics.length) {
      runSchematics(generatorName, runOptions);
    } else if (yeomans.length) {
      runYeoman(generatorName, runOptions);
    } else {
      console.log('Garment configuration does not define any generators');
    }
  } else {
    if (schematics.length) {
      showSchematicsList();
    }
    if (yeomans.length) {
      showYeomanList();
    }
  }
}
