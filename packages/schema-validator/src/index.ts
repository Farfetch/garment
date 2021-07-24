import * as Ajv from 'ajv';
import { OptionsValidationError } from './SchemaOptionsValidationError';

const ajv = new Ajv({
  errorDataPath: 'configuration',
  allErrors: true,
  verbose: true,
  useDefaults: true,
});
ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));

ajv.addFormat('path', { validate: () => true });

export function validateSchema(schema: any, options: any, type: string) {
  const validate = ajv.compile(schema);
  const valid = validate(options);
  if (!valid) {
    const errors = validate.errors ? filterErrors(validate.errors) : [];
    return new OptionsValidationError(errors, type, schema);
  }
}

function filterErrors(
  errors: (Ajv.ErrorObject & { children?: Ajv.ErrorObject[] })[] = []
) {
  let newErrors: typeof errors = [];
  for (const err of errors) {
    const dataPath = err.dataPath;
    let children: any[] = [];
    newErrors = newErrors.filter((oldError) => {
      if (oldError.dataPath.includes(dataPath)) {
        if (oldError.children) {
          children = children.concat(oldError.children.slice(0));
        }
        oldError.children = undefined;
        children.push(oldError);
        return false;
      }
      return true;
    });
    if (children.length) {
      err.children = children;
    }
    newErrors.push(err);
  }

  return newErrors;
}
