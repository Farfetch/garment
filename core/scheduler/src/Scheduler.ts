import { Graph } from '@garment/dependency-graph';
import { RunnerMeta } from '@garment/runner';
import { Project } from '@garment/workspace';
import { Action } from './Action';

export type ActionResult = {
  logs: any[];
  output: any;
  error: any;
};

export type Batch = { project: Project; options: any }[];

export type onUpdateEvent =
  | { type: 'all-actions'; actions: Action[] }
  | { type: 'before-action'; action: Action }
  | { type: 'action-done'; action: Action; result: ActionResult }
  | { type: 'action-skip'; action: Action }
  | { type: 'before-batch'; runner: RunnerMeta; batch: Batch }
  | {
      type: 'batch-done';
      runner: RunnerMeta;
      batch: Batch;
      result: ActionResult;
    }
  | { type: 'done'; graph: Graph<Action> }
  | { type: 'reset' };

export interface CommonExecuteOptions {
  dryRun?: boolean;
}

export class Scheduler {
  onUpdate: (event: onUpdateEvent) => void;

  constructor(
    private readonly props: {
      rebuilder: (
        action: Action,
        actionGraph: Graph<Action>
      ) => void | Promise<void>;
      onUpdate?(event: onUpdateEvent): void;
    }
  ) {
    this.onUpdate = props.onUpdate || (() => {});
  }

  async execute(actionGraph: Graph<Action>) {
    await actionGraph.traverseParallel(async action => {
      await this.props.rebuilder(action, actionGraph);
    }, 6);
  }
}
