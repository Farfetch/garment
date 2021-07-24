import * as treeify from 'treeify';

type Tree =
  | { [key: string]: string | Tree }
  | string[]
  | string
  | number
  | number[];

function transformTree(tree: Tree, depth = 0) {
  if (Array.isArray(tree)) {
    return (tree as string[]).reduce((obj, item) => {
      obj[item] = transformTree(item, depth + 1);
      return obj;
    }, {} as { [key: string]: any });
  } else if (typeof tree === 'object') {
    const result: { [key: string]: any } = {};
    for (const [key, value] of Object.entries(tree)) {
      result[key] = transformTree(value, depth + 1);
    }
    return result;
  } else {
    return depth === 0
      ? {
          [tree]: null,
        }
      : null;
  }
}

export function printTree(tree: Tree) {
  return treeify.asTree(transformTree(tree) as any, true, true);
}
