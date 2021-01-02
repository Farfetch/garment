import path = require('path');

export const isSubPath = (parent: string, child: string) => {
  const relative = path.relative(parent, child);

  // isAbsolute is used for win32 OS
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
};
