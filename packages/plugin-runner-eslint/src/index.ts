import {
  defineOptionsFromJSONSchema,
  defineRunner,
  File
} from '@garment/runner';
import { CLIEngine } from 'eslint';

/**
 * Runs ESLint
 * @example {
    "runner": "eslint",
    "input": "{{projectFolder}}/src",
    "options": {
      "configFile": ".eslintconfig.json"
    }
  }
 */
interface EslintRunnerOptions {
  /**
   * The config file to load ESLint's configuration from.
   * @format path
   */
  configFile?: string;

  /**
   * Fix automatically linting errors.
   */
  fix?: boolean;
}

enum SeverityLevel {
  Warning = 1,
  Error = 2
}

export default defineRunner(
  defineOptionsFromJSONSchema<EslintRunnerOptions>(require('./schema.json')),
  async function(ctx) {
    const { logger, options, input, workspace, project } = ctx;
    const { configFile, outputDir, fix: fixFlag } = options;
    const fix = Boolean(outputDir) && fixFlag;

    /*
     * Updates the cwd to be the project
     * In this way the TS parser will only parse the project files
     */
    process.chdir(project.fullPath);

    logger.info(`Linting files with ESLint`);

    const cliEngineOpts: CLIEngine.Options = { fix, cwd: workspace.cwd };
    // if user specifies configFile should set useEslintrc to false
    if (configFile) {
      cliEngineOpts.configFile = configFile;
      cliEngineOpts.useEslintrc = false;
    }

    const cli = new CLIEngine(cliEngineOpts);

    ctx.input(files => {
      const fixes: File[] = [];

      files.forEach(file => {
        const { results } = cli.executeOnText(
          file.data.toString('utf8'),
          file.absolutePath
        );

        const warningResults = filterResultsBySeverity(
          results,
          SeverityLevel.Warning
        );
        const errorResults = filterResultsBySeverity(
          results,
          SeverityLevel.Error
        );
        const formatter = cli.getFormatter();
        const regexMatcher = /\n.*\u2716 .*\).*\n/;
        const fixableMessageMatcher = /[0-9]+ errors and [0-9]+ warnings .*/;
        if (errorResults.length) {
          const errorPrint = formatter(errorResults)
            .replace(regexMatcher, '')
            .replace(fixableMessageMatcher, '');
          logger.error(errorPrint);
        }
        if (warningResults.length) {
          logger.warn(
            formatter(warningResults)
              .replace(regexMatcher, '')
              .replace(fixableMessageMatcher, '')
          );
        }

        for (const { output } of results) {
          if (output && fix) {
            fixes.push(ctx.file.text(file.path, output));
          }
        }
      });

      return fixes;
    });
  }
);

function filterResultsBySeverity(
  results: CLIEngine.LintResult[],
  severity: SeverityLevel
) {
  const filtered: CLIEngine.LintResult[] = [];

  const count = (sevLevel: SeverityLevel, messagesSum: number) => {
    return severity === sevLevel ? messagesSum : 0;
  };

  results.forEach(result => {
    const filteredMessages = result.messages.filter(
      mess => mess.severity === severity
    );

    if (filteredMessages.length > 0) {
      filtered.push({
        ...result,
        messages: filteredMessages,
        errorCount: count(SeverityLevel.Error, filteredMessages.length),
        warningCount: count(SeverityLevel.Warning, filteredMessages.length),
        fixableErrorCount: result.fixableErrorCount,
        fixableWarningCount: 0
      });
    }
  });

  return filtered;
}
