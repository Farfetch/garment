import { defineRunner, defineOptionsFromJSONSchema } from '@garment/runner';
const lighthouse = require('lighthouse');
import * as chromeLauncher from 'chrome-launcher';
import dargs = require('dargs');

/**
 * Runs Lighthouse
 * @example {
    "runner": "lighthouse",
    "output": "{{projectDir}}/lighthouse-output",
    "options": {
      "port": 3000,
      "budget": "{{projectDir}}/budget.json",
      "scoreThreshold": {
        "performance": 90,
        "accessibility": 90,
        "seo": 100,
        "pwa": 80,
        "best-practices": 80
      }
    }
  }
 */
interface LighthouseRunnerOptions {
  url?: string;
  port?: number;
  chromeFlags?: any;

  /**
   * @format path
   */
  budget: string;
  scoreThreshold?: {
    [key: string]: number;
  };

  /**
   * @format path
   */
  config?: string;
  reportFormat?: 'html' | 'json';
}

export default defineRunner(
  defineOptionsFromJSONSchema<LighthouseRunnerOptions>(
    require('./schema.json')
  ),
  async ctx => {
    const { logger, options, fs, project } = ctx;
    const {
      port,
      url = `http://localhost:${port}`,
      budget,
      scoreThreshold,
      config,
      chromeFlags,
      reportFormat = 'html'
    } = options;

    async function launchChromeAndRunLighthouse(url: string, flags: any) {
      const chrome = await chromeLauncher.launch({
        chromeFlags: flags.chromeFlags
      });
      flags.port = chrome.port;
      const results = await lighthouse(url, flags, flags.config);
      await chrome.kill();
      return results;
    }

    function checkBudget(lhr: any) {
      const categories = Object.entries(lhr.categories);

      if (lhr.audits['performance-budget']) {
        logger.info(`${lhr.audits['performance-budget'].title}\n`);

        lhr.audits['performance-budget'].details.items.forEach((item: any) => {
          logger.info(item.label);
          item.sizeOverBudget
            ? logger.error(
                `Exceeds budget by:${formatBytes(item.sizeOverBudget)}\n`
              )
            : logger.success(`${formatBytes(item.size)}\n`);
        });

        if (scoreThreshold) {
          logger.info('Score Thresholds:\n');
          categories.map(cat => {
            const categorydata: any = cat[1];
            const score = categorydata.score * 100;
            const threshold = scoreThreshold[categorydata.id];
            if (threshold) {
              const message = `Score: ${score} Threshold: ${threshold}\n`;
              logger.info(`${categorydata.title}`);
              score >= threshold
                ? logger.success(message)
                : logger.error(message);
            }
          });
        }
      }
      logAuditResults(categories, lhr);
    }

    function logAuditResults(categories: any[], lhr: any) {
      logger.info(`Audit Results:\n`);
      categories.map(item => {
        const categorydata: any = item[1];
        logger.info(`${categorydata.title}\n`);

        categorydata.auditRefs.forEach((ref: any) => {
          if (lhr.audits[ref.id].score === 1) {
            logger.success(`${lhr.audits[ref.id].title}\n`);
          }
        });

        categorydata.auditRefs.forEach((ref: any) => {
          if (lhr.audits[ref.id].score > 0 && lhr.audits[ref.id].score < 1) {
            logger.warn(`${lhr.audits[ref.id].title}\n`);
          }
        });

        categorydata.auditRefs.forEach((ref: any) => {
          if (lhr.audits[ref.id].score === 0) {
            logger.error(`${lhr.audits[ref.id].title}\n`);
          }
        });
      });

      logger.info(
        `You can get more info by using the generated lighthouse.json file at https://googlechrome.github.io/lighthouse/viewer/ \n`
      );
    }

    function formatBytes(bytes: number, decimals = 2) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const dm = decimals < 0 ? 0 : decimals;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));

      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    let flags: any = {};

    if (budget) {
      flags.budgets = JSON.parse(fs.readFileSync(budget, { encoding: 'utf8' }));
    }

    if (config) {
      flags.config = JSON.parse(fs.readFileSync(config, { encoding: 'utf8' }));
    }

    if (chromeFlags) {
      flags.chromeFlags = dargs(chromeFlags);
    }

    flags.output = reportFormat;

    const results = await launchChromeAndRunLighthouse(url, flags);
    checkBudget(results.lhr);
    return ctx.file.text(`${project.fullPath}/lighthouse.html`, results.report);
  }
);
