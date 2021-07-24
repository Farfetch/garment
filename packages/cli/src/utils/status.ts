import { Action, ActionResult } from '@garment/scheduler';
import chalk from 'chalk';
import log, { Logger, shouldPrint } from '@garment/logger';

export class Status {
  private actionsByProjectName = new Map<
    string,
    {
      total: number;
      done: number;
      hasErrors?: boolean;
      hasWarnings?: boolean;
      logs: string[];
    }
  >();
  private hasBatchErrors = false;

  private timeStartedByProject = new Map<string, number>();

  currentlyExecutedProjects = new Set<string>();
  doneProjects = new Set<string>();
  tasksTotal = 0;
  tasksDone = 0;

  constructor(
    private readonly onChange: (
      status: ReturnType<typeof Status.prototype.get>
    ) => void
  ) {}

  get hasErrors() {
    return (
      Array.from(this.actionsByProjectName.values()).some((stat) =>
        Boolean(stat.hasErrors)
      ) || this.hasBatchErrors
    );
  }

  setActions(...actions: Action[]) {
    for (const action of actions) {
      const { name } = action.project;
      if (!this.actionsByProjectName.has(name)) {
        this.actionsByProjectName.set(name, {
          total: 0,
          done: 0,
          logs: [],
        });
      }
      const stats = this.actionsByProjectName.get(name)!;
      stats.total += 1;
    }
    this.tasksTotal = actions.length;
    this.emit();
  }

  progress(done: number, total: number) {
    this.tasksDone = done;
    this.tasksTotal = total;
    this.emit();
  }

  actionStarted({ project: { name } }: Action) {
    if (!this.currentlyExecutedProjects.has(name)) {
      this.currentlyExecutedProjects.add(name);
      this.timeStartedByProject.set(name, Date.now());

      this.emit();
    }
  }

  actionFinished(action: Action, result: ActionResult) {
    const stats = this.actionsByProjectName.get(action.project.name);
    if (stats) {
      result.logs.forEach((entry) => {
        if (shouldPrint(entry.level, log.level)) {
          stats.logs.push(
            Logger.print(
              { scope: entry.scope, level: entry.level, dontLog: true },
              ...entry.content
            ).join(' ')
          );
        }
        if (entry.level === 'error') {
          stats.hasErrors = true;
        } else if (entry.level === 'warn') {
          stats.hasWarnings = true;
        }
      });
      if (result.error) {
        stats.logs.push(
          Logger.print(
            { scope: '    ', level: 'error', dontLog: true },
            ...result.error
          ).join(' ')
        );
        stats.hasErrors = true;
      }
      stats.done += 1;

      this.tasksDone += 1;

      this.emit();
    }
  }

  actionSkipped(action: Action) {
    const stats = this.actionsByProjectName.get(action.project.name);
    if (stats) {
      stats.total -= 1;
      this.emit();
    }
  }

  get() {
    const { currentlyExecutedProjects, tasksTotal, tasksDone } = this;

    const done: string[] = [];
    const inProgress: string[] = [];

    for (const name of currentlyExecutedProjects) {
      const actionsStats = this.actionsByProjectName.get(name);
      if (actionsStats) {
        if (actionsStats.done < actionsStats.total) {
          inProgress.push(
            `    ${chalk.bold.whiteBright(name)} ${actionsStats.done} of ${
              actionsStats.total
            } subtasks done`
          );
        } else {
          const timeStarted = this.timeStartedByProject.get(name) ?? Date.now();
          const totalTimeInSeconds = (
            (Date.now() - timeStarted) /
            1000
          ).toFixed(2);
          // (${chalk.hex('cdd281')(totalTimeInSeconds + 's')})
          // TODO get back to showing time when we figure out how
          const badge = actionsStats.hasErrors
            ? chalk.bgRedBright.black(' HAS ERRORS ')
            : actionsStats.hasWarnings
            ? chalk.bgYellowBright.black(' DONE ')
            : chalk.bgGreenBright.black(' DONE ');
          done.push(
            `${badge} Project ${chalk.bold.whiteBright(name)} ${
              actionsStats.done
            } subtasks done`
          );
          if (actionsStats.logs.length) {
            done.push('', ...actionsStats.logs, '');
          }
          currentlyExecutedProjects.delete(name);
        }
      }
    }

    const dynamic: string[] = [];
    if (inProgress.length) {
      dynamic.push('', 'Projects in progress:', '');
      dynamic.push(...inProgress.slice(0, 3));
      if (inProgress.length > 3) {
        dynamic.push(`    and ${inProgress.length - 3} more...`);
      }
    } else if (tasksDone >= tasksTotal) {
      const totals = {
        [chalk.bold('Projects')]: this.actionsByProjectName.size,
        [chalk.bold('Tasks')]: this.tasksTotal,
      };
      const maxStatName =
        Math.max(...Object.keys(totals).map((_) => _.length)) + 2;
      done.push('');
      for (const [key, value] of Object.entries(totals)) {
        done.push(`${key}:`.padEnd(maxStatName) + value + ' total');
      }
      done.push('');
    }

    return { done, dynamic, height: dynamic.length };
  }

  batchStarted() {
    const done = ['', `Starting executing batch`];
    this.onChange({ done, dynamic: [], height: 0 });
  }

  batchFinished(result: ActionResult) {
    const done = ['', `Batch execution finished`, ''];
    result.logs.forEach((entry) => {
      if (shouldPrint(entry.level, log.level)) {
        done.push(
          Logger.print(
            { scope: entry.scope, level: entry.level, dontLog: true },
            ...entry.content
          ).join(' ')
        );
      }
      if (entry.level === 'error') {
        this.hasBatchErrors = true;
      }
    });
    this.onChange({ done, dynamic: [], height: 0 });
  }

  reset() {
    this.actionsByProjectName = new Map();

    this.currentlyExecutedProjects = new Set<string>();
    this.doneProjects = new Set<string>();
    this.tasksTotal = 0;
    this.tasksDone = 0;
  }

  flush() {
    if (!this.currentlyExecutedProjects.size) {
      return;
    }
    for (const name of this.currentlyExecutedProjects) {
      const actionsStats = this.actionsByProjectName.get(name);
      if (actionsStats) {
        actionsStats.total = actionsStats.done;
      }
    }
    this.tasksTotal = this.tasksDone;
    this.emit();
  }

  clear() {
    this.onChange({ done: [''], dynamic: [], height: 0 });
  }

  emit() {
    this.onChange(this.get());
  }
}
