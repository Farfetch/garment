import { RunnerMeta } from '@garment/runner';
import { Project, Workspace, OutputMode } from '@garment/workspace';

export type Action = RunnerAction;

export type Input = {
  rootDir: string;
  files?: string[];
  include?: string[];
  exclude?: string[];
};

export interface RunnerAction {
  id: number;
  task: string;
  workspace: Workspace;
  runner: RunnerMeta;
  lifecycle: boolean;
  watch: boolean;
  hash: string;
  skipExecution?: boolean;
  pipe: string;
  type: 'runner';
  project: Project;
  options: any;
  input?: Input;
  output?: string[];
  outputMode?: OutputMode;
}
