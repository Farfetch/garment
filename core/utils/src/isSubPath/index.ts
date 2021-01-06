import * as Path from 'path';

export const isSubPath = (parent: string, child: string) => {
  const relative = Path.relative(parent, child);

  return relative && !relative.startsWith('..') && !Path.isAbsolute(relative);
};
