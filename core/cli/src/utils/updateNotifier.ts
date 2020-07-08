import * as updateNotifier from 'update-notifier';
import chalk from 'chalk';
const pkg = require('../../package.json');

const notifier = updateNotifier({
  pkg,
  shouldNotifyInNpmScript: true,
  updateCheckInterval: 30 * 60 * 1000
});

export default () => {
  if (notifier.update) {
    return `${chalk.yellowBright('Update available:')} ${chalk.greenBright(
      notifier.update.latest
    )}\n`;
  }
  return '';
};
