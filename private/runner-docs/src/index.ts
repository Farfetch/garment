import { defineRunner, defineOptions } from '@garment/runner';
import * as Path from 'path';
import { Project, SourceFile } from 'ts-morph';

export default defineRunner(
  defineOptions({
    template: ['path', 'Path to the template'],
    filename: ['string?', 'Name of the output file', 'README.md']
  }),
  async ctx => {
    const { template, filename } = ctx.options;
    const packageName = ctx.project.nodePackage?.name;

    const templateContent = ctx.renderTemplate(
      ctx.fs.readFileSync(template, 'utf8'),
      { packageName }
    );

    const templateLines = templateContent.split('\n');
    const updatedTemplateLines = [];

    const project = new Project({});
    const sourceFiles: Record<string, SourceFile> = {};

    let ignoreLine = false;

    for (const line of templateLines) {
      const match = /<!--\s*(.*)\s*-->/.exec(line);
      if (match) {
        const [op, ...args] = match[1].split(/\s+/);

        if (op === 'api') {
          const [filename, declarationName] = args;

          const sourceFile = getSourceByFilename(filename);

          const declaration =
            declarationName === 'firstInterface'
              ? sourceFile.getInterfaces()[0]
              : sourceFile.getInterfaceOrThrow(declarationName);

          const allResults = [];

          for (const member of declaration.getMembers()) {
            let result = [];
            const name = (member as any).getName();
            let type = member.getType().getText();
            let defaultValue;
            let comment;

            const [jsdoc] = member.getJsDocs();
            if (jsdoc) {
              comment = jsdoc.getDescription().trim();
              const tags: Record<string, string> = {};
              for (const tag of jsdoc.getTags()) {
                tags[tag.getTagName()] = tag.getComment()?.trim() ?? '';
              }

              if (tags.format === 'path') {
                type = 'path';
              }

              defaultValue = tags.defaultDescription || tags.default;
            }

            result.push(`\`${name}: ${type}\``);
            if (defaultValue) {
              result.push(`**Default:** \`${defaultValue}\``);
            }
            if (comment) {
              result.push(comment);
            }

            allResults.push(result.join('\n\n'));
          }

          ignoreLine = true;

          updatedTemplateLines.push(line);

          allResults.forEach((result, index) => {
            updatedTemplateLines.push(result);
            if (index === allResults.length - 1) {
              updatedTemplateLines.push('\n');
            } else {
              updatedTemplateLines.push('\n---\n');
            }
          });
        } else if (op === 'example' || op === 'description') {
          const [filename, declarationName] = args;

          const sourceFile = getSourceByFilename(filename);

          const declaration =
            declarationName === 'firstInterface'
              ? sourceFile.getInterfaces()[0]
              : sourceFile.getInterfaceOrThrow(declarationName);

          const allResults = [];

          const [jsdoc] = declaration.getJsDocs();
          if (jsdoc) {
            if (op === 'example') {
              const tags: Record<string, string> = {};
              for (const tag of jsdoc.getTags()) {
                tags[tag.getTagName()] = tag.getComment()?.trim() ?? '';
              }

              if (tags.example) {
                let parsed = tags.example;
                try {
                  parsed = JSON.stringify(JSON.parse(parsed), null, 4);
                } catch (error) {}

                allResults.push('```json');
                allResults.push(parsed);
                allResults.push('```\n');
              }
            } else if (op === 'description') {
              const description = jsdoc.getDescription().trim();
              allResults.push(description);
              allResults.push('\n');
            }
          }

          ignoreLine = true;

          updatedTemplateLines.push(line, ...allResults);
        } else if (op === 'installation') {
          updatedTemplateLines.push(line);
          if (packageName) {
            updatedTemplateLines.push(`\`npm i ${packageName}\`\n`);
            updatedTemplateLines.push(`or\n`);
            updatedTemplateLines.push(`\`yarn add ${packageName}\`\n`);
          }

          ignoreLine = true;
        } else if (op === 'break') {
          ignoreLine = false;
        }
      } else if (line[0] === '#') {
        ignoreLine = false;
      }

      if (!ignoreLine) {
        updatedTemplateLines.push(line);
      }
    }

    return ctx.file.text(filename, updatedTemplateLines.join('\n'));

    function getSourceByFilename(filename: string) {
      const resolvedFilename = Path.resolve(ctx.project.fullPath, filename);
      if (!sourceFiles[resolvedFilename]) {
        sourceFiles[resolvedFilename] = project.addSourceFileAtPath(
          resolvedFilename
        );
      }
      return sourceFiles[resolvedFilename];
    }
  }
);
