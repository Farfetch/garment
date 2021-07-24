import {
  applyContentTemplate,
  applyPathTemplate,
  FileEntry,
  PathTemplateData,
  PathTemplateOptions,
  Rule,
  TEMPLATE_FILENAME_RE,
} from '@angular-devkit/schematics';
import {
  composeFileOperators,
  forEach,
  when,
} from '@angular-devkit/schematics/src/rules/base';

export function applyTemplates<T>(
  options: T,
  pathTemplateOptions: PathTemplateOptions
): Rule {
  return forEach(
    when(
      (path) => path.endsWith('.template'),
      composeFileOperators([
        applyContentTemplate(options),
        // See above for this weird cast.
        applyPathTemplate(
          (options as {}) as PathTemplateData,
          pathTemplateOptions
        ),
        (entry) => {
          return {
            content: entry.content,
            path: entry.path.replace(TEMPLATE_FILENAME_RE, ''),
          } as FileEntry;
        },
      ])
    )
  );
}
