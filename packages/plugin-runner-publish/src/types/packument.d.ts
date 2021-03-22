declare module 'packument' {
  export = index;

  function index(
    name: string,
    callback: (err: any, result: index.Result) => void
  ): void;

  namespace index {
    function factory(defaults: any): any;

    interface Result {
      maintainers: Maintainer[];
      'dist-tags': Obj;
      versions: Obj<Version>;
      name: string;
      _rev: string;
      readme: string;
      time: ITime;
      _id: string;
    }
  }

  interface Obj<T = string> {
    [key: string]: T;
  }
  interface Maintainer {
    name: string;
    email: string;
  }

  interface Version {
    name: string;
    version: string;
    main: string;
    license: string;
    bin: string | Obj;
    dependencies: Obj;
    devDependencies: Obj;
    files: string[];
    readme: string;
    _id: string;
    _npmVersion: string;
    _nodeVersion: string;
    _npmUser: User;
    maintainers: Maintainer[];
    dist: IDist;
  }

  interface User {
    name: string;
    email: string;
  }

  interface IDist {
    integrity: string;
    shasum: string;
    tarball: string;
  }

  interface ITime extends Obj {
    created: string;
    modified: string;
  }
}
