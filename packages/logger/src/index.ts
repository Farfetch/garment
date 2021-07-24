import chalk from 'chalk';
import stripAnsi from 'strip-ansi';

const levelsMap = {
  silly: 0,
  debug: 1,
  info: 2,
  success: 3,
  warn: 4,
  error: 5,
  silent: 6,
};

export type Level = keyof typeof levelsMap;

const logTypeToTextMap: { [key in Level]?: string } = {
  silly: chalk.keyword('purple')('silly'),
  debug: chalk.keyword('cyan')('debug'),
  info: chalk.keyword('lightblue')('info'),
  warn: chalk.keyword('yellow')('warning'),
  error: chalk.keyword('darkred')('error'),
  success: chalk.keyword('lime')('success'),
};

export function shouldPrint(level: Level, currentLevel: Level) {
  return levelsMap[level] >= levelsMap[currentLevel];
}

export const levels = Object.keys(levelsMap);

export class Logger {
  public static print(
    options: {
      prefix?: string;
      scope?: string;
      level?: Level;
      scopeColor?: string;
      dontLog?: boolean;
    } = {},
    ...args: any[]
  ) {
    const meta: string[] = [];
    const { prefix, scope, level, scopeColor = 'magenta', dontLog } = options;
    if (prefix) {
      meta.push(chalk.grey(prefix));
    }
    if (scope) {
      meta.push(chalk.keyword(scopeColor)(scope));
    }
    if (level) {
      meta.push(logTypeToTextMap[level] || level);
    }
    const joinedMeta = meta.join(' ');

    const indentedArgs = args
      .map((arg) => (Object(arg) !== arg ? arg : JSON.stringify(arg)))
      .join(' ')
      .split(/\n/)
      .join('\n' + ' '.repeat(stripAnsi(joinedMeta).length + 1));

    const consoleLogArgs: string[] = [joinedMeta, indentedArgs];
    if (!dontLog) {
      console.log(...consoleLogArgs);
    }
    return consoleLogArgs;
  }

  interceptors: ((entry: { level: Level; args: any[] }) => any)[] = [];

  constructor(
    public readonly prefix: string | undefined,
    public readonly name: string,
    public level: Level = 'info',
    public readonly color?: string
  ) {}

  public silly(...args: any[]) {
    this.display('silly', ...args);
  }

  public debug(...args: any[]) {
    this.display('debug', ...args);
  }

  public info(...args: any[]) {
    this.display('info', ...args);
  }

  public warn(...args: any[]) {
    this.display('warn', ...args);
  }

  public error(...args: any[]) {
    this.display('error', chalk.keyword('red')(...args));
  }

  public success(...args: any[]) {
    this.display('success', ...args);
  }

  public log(...args: any[]) {
    Logger.print({}, ...args);
  }

  public createChild(scope: string, color?: string) {
    return new Logger(this.prefix, scope, this.level, color);
  }

  public setLevel(level: Level) {
    this.level = level;
  }

  private display(level: Level, ...args: any[]) {
    if (
      !this.interceptors.every((fn) => {
        const result = fn({ level, args });
        return typeof result === 'boolean' ? result : true;
      })
    ) {
      return;
    }
    if (shouldPrint(level, this.level)) {
      Logger.print(
        {
          prefix: this.prefix,
          scope: this.name,
          level,
          scopeColor: this.color,
        },
        ...args
      );
    }
  }
}

export default new Logger('', '', 'info');
