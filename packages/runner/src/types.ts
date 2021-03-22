export type File = TextFile | JsonFile | SourceFile | BinaryFile;

export interface JsonFile extends BaseFile {
  type: 'json';
  data: object;
}

export interface SourceFile extends BaseFile {
  type: 'source';
  data: string;
  map?: any;
}

export interface TextFile extends BaseFile {
  type: 'text';
  data: string;
}

export interface BinaryFile extends BaseFile {
  type: 'binary';
  data: Buffer;
}

export interface BaseFile {
  path: string;
  absolutePath?: string;
  baseDir?: string;
  skipWrite?: boolean;
}
