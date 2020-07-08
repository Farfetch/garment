import * as fs from 'fs-extra';
import { createWorkspace } from '../../utils/createWorkspace';
import { getCacheConfig } from '../../utils/getCacheConfig';

interface CacheCommandOptions {
  subCommand: 'clean';
}

export async function run(argv: CacheCommandOptions) {
  const { subCommand } = argv;
  const workspace = await createWorkspace();

  const cacheConfig = getCacheConfig(workspace);

  console.log(`Cache type: ${cacheConfig.type}`);
  if (cacheConfig.type === 'file') {
    console.log(`Cache directory: ${cacheConfig.cacheDir}`);
  }
  switch (subCommand) {
    case 'clean':
      if (cacheConfig.type === 'file') {
        await fs.remove(cacheConfig.cacheDir);
        await fs.ensureDir(cacheConfig.cacheDir);
        console.log(`Cache directory has been cleaned`);
        break;
      } else {
        console.log(`Can't clean cache of non-file type`);
      }

    default:
      break;
  }
}
