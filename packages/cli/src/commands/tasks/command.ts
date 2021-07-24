import * as yargs from 'yargs';
import chalk from 'chalk';
import { createWorkspace } from '../../utils/createWorkspace';

const command = 'tasks [project]';

const describe = `List project's tasks`;

const builder = (yargs: yargs.Argv) => {
  return yargs.options({});
};

const handler = async (argv: any) => {
  const { project: projectName } = argv as { project: string };

  const workspace = await createWorkspace();

  const project =
    workspace.projects.get(projectName) || workspace.currentProject;
  if (!project) {
    throw new Error(`Project "${projectName}" does not exist`);
  }

  function ident(k: number, text: string) {
    return ' '.repeat(k * 2) + text;
  }

  for (const [name, definition] of Object.entries(project.tasks)) {
    console.log(ident(0, chalk.bold.whiteBright(name)));

    function iterateDef(def: typeof definition, level: number) {
      if (def.runner) {
        console.log(ident(level, def.runner));
      } else if (def.parallel) {
        if (Array.isArray(def.parallel)) {
          def.parallel.forEach((d: any) => iterateDef(d, level));
        } else {
          iterateDef(def.parallel, level);
        }
      }
      if (def.next) {
        if (Array.isArray(def.next)) {
          def.next.forEach((d) => iterateDef(d, level + 1));
        } else {
          iterateDef(def.next, level + 1);
        }
      }
    }

    iterateDef(definition, 1);
  }
};

export { command, describe, builder, handler };
