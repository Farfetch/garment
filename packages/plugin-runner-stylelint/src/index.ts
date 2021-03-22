import {
  defineOptionsFromJSONSchema,
  defineRunner,
  File
} from '@garment/runner';
import chalk from 'chalk';
import * as stylelint from 'stylelint';
import { LintResult } from 'stylelint';
import * as table from 'text-table';

/**
 * Runs stylelint
 * @example {
    "runner": "stylelint",
    "input": "{{projectDir}}/src/**\/*.css",
    "output": "{{projectDir}}/lib",
    "options": {
      "configFile": ".stylelintconfig.json",
      "fix": true
    }
  }
 */
export interface StylelintRunnerOptions {
  /**
   * The config file to load stylelint config from
   * @format path
   */
  configFile?: string;

  /**
   * Fix automatically linting errors
   */
  fix?: boolean;
}

export default defineRunner(
  defineOptionsFromJSONSchema<StylelintRunnerOptions>(require('./schema.json')),
  async ctx => {
    const { logger } = ctx;
    const { configFile, outputDir, fix: fixFlag } = ctx.options;
    const fix = Boolean(outputDir) && fixFlag;

    ctx.input(async files => {
      const fixes: File[] = [];

      await mapAsyncSequence(files, async file => {
        const { results, output } = await stylelint.lint({
          code: file.data.toString('utf8'),
          codeFilename: file.absolutePath,
          configFile,
          fix,
          formatter: 'string'
        });

        const warningResults = getResultsBySeverity(results, 'warning');
        const errorResults = getResultsBySeverity(results, 'error');

        if (warningResults.length) {
          logger.warn(transformResults(warningResults));
        }
        if (errorResults.length) {
          logger.error(transformResults(errorResults));
        }

        if (output && fix) {
          fixes.push(ctx.file.text(file.path, output));
        }
      });

      return fixes;
    });
  }
);

function getResultsBySeverity(
  results: LintResult[],
  severityLevel: 'error' | 'warning'
): LintResult[] {
  const filtered: LintResult[] = [];

  results.forEach(result => {
    const filteredMessages = result.warnings.filter(
      (warning: any) => warning.severity === severityLevel
    );

    if (filteredMessages.length > 0) {
      filtered.push({
        ...result,
        warnings: filteredMessages,
        errored: severityLevel === 'error'
      });
    }
  });

  return filtered;
}

function transformResults(results: LintResult[]) {
  const errorIcon = chalk.red('✖');
  const warningIcon = chalk.yellow('⚠');

  return (
    results
      .map(result => {
        const output = `\n${chalk.underline(result.source)}\n`;

        const tableResult = result.warnings.map((warning: any) => {
          //remove rule's name that comes in parenthesis in text
          const text = warning.text.replace(/\(.*\)/, '');
          const severity = (<any>result.warnings[0]).severity;

          return [
            '',
            chalk.dim(`${warning.line}.${warning.column}`),
            severity === 'warning' ? warningIcon : errorIcon,
            text,
            chalk.dim(warning.rule)
          ];
        });

        return (output + table(tableResult)).replace(
          /(\d+)\.+(\d+)/g,
          (_match, p1, p2) => `${p1}:${p2}`
        );
      })
      .join('\n') + '\n'
  );
}

async function mapAsyncSequence<T, K>(items: T[], cb: (item: T) => Promise<K>) {
  const result: K[] = [];
  for (const item of items) {
    result.push(await cb(item));
  }
  return result;
}
