declare module '@wdio/cli' {
  class Launcher {
    runner: Runner;
    exitHandler(arg0: () => void): Promise<any>;
    constructor(config: string, opts: any);
    run(): Promise<number>;
  }

  class Runner {
    shutdown(): Promise<any>;
  }

  export default Launcher;
}
