declare module 'typed-css-modules' {
  interface Options {
    rootDir?: any;
    searchDir?: any;
    outDir?: any;
    camelCase?: any;
    EOL?: any;
  }

  class DtsCreator {
    constructor(options?: Options);
    create(filePath: any, initialContents?: any): Promise<DtsContent>;
  }

  class DtsContent {
    writeFile(): Promise<DtsContent>;
    contents: string[];
    formatted: string;
    messageList: string[];
    outputFilePath: string;
  }
  namespace DtsCreator {}
  export = DtsCreator;
}
