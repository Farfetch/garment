import path = require('path');

export const isSubPath = (parent: string, child: string) => {
  const relative = path.relative(parent, child);

  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
};
