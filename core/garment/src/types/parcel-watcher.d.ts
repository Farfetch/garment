declare module '@parcel/watcher' {
  export interface Event {
    type: 'create' | 'update' | 'delete';
    path: string;
  }

  export interface Opts {
    ignore?: string[];
    backend?: 'fs-events' | 'watchman' | 'inotify' | 'windows' | 'brute-force';
  }

  export function writeSnapshot(
    dir: string,
    snapshotPath: string,
    opts?: Opts
  ): void;

  export function getEventsSince(
    dir: string,
    snapshotPath: string,
    opts?: Opts
  ): void;

  export function subscribe(
    dir: string,
    fn: (err: any, events: Event[]) => void,
    opts?: Opts
  ): Promise<{ unsubscribe(): Promise<void> }>;
}