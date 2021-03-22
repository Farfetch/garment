export function sortObject<T extends { [key: string]: any }, K extends keyof T>(
  obj: T,
  field: (entry: [K, T[K]]) => any = ([key]) => key
): T {
  const sortedObj: any = {};
  Array.from(Object.entries<any>(obj))
    .sort((entryA: any, entryB: any) =>
      field(entryA) < field(entryB) ? -1 : field(entryA) > field(entryB) ? 1 : 0
    )
    .forEach(([key, value]) => {
      sortedObj[key] = value;
    });
  return sortedObj;
}
