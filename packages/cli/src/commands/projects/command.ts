import chalk from 'chalk';
import * as yargs from 'yargs';
import { createWorkspace } from '../../utils/createWorkspace';

const command = 'projects';

const describe = `List projects`;

const builder = (yargs: yargs.Argv) => {
  return yargs.options({});
};

const handler = async () => {
  const workspace = await createWorkspace();
  const projects = Array.from(workspace.projects);

  console.log(`Workspace has ${projects.length} projects:\n`);

  for (const project of projects) {
    console.log(chalk.whiteBright(project.name), chalk.dim(project.path));
  }
};

export { command, describe, builder, handler };
