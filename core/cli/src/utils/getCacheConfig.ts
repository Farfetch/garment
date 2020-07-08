import { Workspace } from '@garment/workspace';

export function getCacheConfig(workspace: Workspace) {
  const {
    config: { cache }
  } = workspace;
  const defaultCacheDir = workspace.resolvePath('node_modules/@garment/.cache');
  const cacheConfig = cache
    ? cache.type === 'file'
      ? ({
          type: 'file',
          cacheDir: cache.cacheDir ?? defaultCacheDir
        } as const)
      : cache
    : ({
        type: 'file',
        cacheDir: defaultCacheDir
      } as const);
  return cacheConfig;
}
