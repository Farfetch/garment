import * as chokidar from 'chokidar';
import * as Path from 'path';

import normalizePath = require('normalize-path');

export interface WatchChange {
  type: 'add' | 'change' | 'unlink';
  path: string;
}

export interface WatchOptions {
  pattern?: string[];
  ignore?: string[];
}

export function watch(
  paths: string[],
  cb: (change: WatchChange) => void,
  options: WatchOptions = {}
) {
  const { ignore = [], pattern } = options;
  const dirsToWatch: string[] = [];

  for (const path of paths) {
    if (pattern) {
      for (const patt of pattern) {
        dirsToWatch.push(normalizePath(Path.join(path, patt)));
      }
    } else {
      dirsToWatch.push(path);
    }
  }

  const watcher = chokidar.watch(dirsToWatch, {
    ignoreInitial: true,
    ignored: [/node_modules/, ...ignore]
  });

  ['add', 'change', 'unlink'].forEach(eventName => {
    watcher.on(eventName, path => {
      cb({ type: eventName as any, path });
    });
  });
}
