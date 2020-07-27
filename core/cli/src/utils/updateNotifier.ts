import * as updateNotifier from 'update-notifier';
import chalk from 'chalk';
const pkg = require('../../package.json');

const { update } = updateNotifier({
  pkg,
  shouldNotifyInNpmScript: true,
  updateCheckInterval: 30 * 60 * 1000
});

export default () => {
  if (update && update.latest !== pkg.version) {
    return `${chalk.yellowBright('Update available:')} ${chalk.greenBright(
      update.latest
    )}\n`;
  }
  return '';
};
