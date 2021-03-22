import * as Ajv from 'ajv';

export type SchemaValidationError = Ajv.ErrorObject & {
  children?: Ajv.ErrorObject[];
  parentSchema?: any;
};

export type Schema = { [key: string]: any };

const indent = (str: string, prefix: string, firstLine: boolean) => {
  if (firstLine) {
    return prefix + str.replace(/\n(?!$)/g, '\n' + prefix);
  } else {
    return str.replace(/\n(?!$)/g, `\n${prefix}`);
  }
};

export class OptionsValidationError extends Error {
  constructor(
    validationErrors: SchemaValidationError[],
    private type: string,
    private schema: Schema
  ) {
    super();

    this.message =
      `Invalid ${type} object.\n` +
      validationErrors
        .map(
          err => ' - ' + indent(this.formatValidationError(err), '   ', false)
        )
        .join('\n');
    this.name = 'OptionsValidationError';

    Error.captureStackTrace(this, this.constructor);
  }

  formatSchema(schema: Schema, prevSchemas?: Schema[]) {
    prevSchemas = prevSchemas || [];

    const formatInnerSchema = (
      innerSchema: Schema,
      addSelf?: boolean
    ): string => {
      if (!addSelf) {
        return this.formatSchema(innerSchema, prevSchemas);
      }
      if (prevSchemas!.includes(innerSchema)) {
        return '(recursive)';
      }
      return this.formatSchema(innerSchema, prevSchemas!.concat(schema));
    };

    if (schema.type === 'string') {
      if (schema.minLength === 1) {
        return 'non-empty string';
      }
      if (schema.minLength > 1) {
        return `string (min length ${schema.minLength})`;
      }
      return 'string';
    }
    if (schema.type === 'boolean') {
      return 'boolean';
    }
    if (schema.type === 'number') {
      return 'number';
    }
    if (schema.type === 'object') {
      if (schema.properties) {
        const required = schema.required || [];
        return `object { ${Object.keys(schema.properties)
          .map(property => {
            if (!required.includes(property)) return property + '?';
            return property;
          })
          .concat(schema.additionalProperties ? ['…'] : [])
          .join(', ')} }`;
      }
      if (schema.additionalProperties) {
        return `object { <key>: ${formatInnerSchema(
          schema.additionalProperties
        )} }`;
      }
      return 'object';
    }
    if (schema.type === 'array') {
      return `[${formatInnerSchema(schema.items)}]`;
    }

    switch (schema.instanceof) {
      case 'Function':
        return 'function';
      case 'RegExp':
        return 'RegExp';
    }

    if (schema.enum) {
      return schema.enum.map((item: any) => JSON.stringify(item)).join(' | ');
    }

    if (schema.$ref) {
      return formatInnerSchema(this.getSchemaPart(schema.$ref), true);
    }
    if (schema.allOf) {
      return schema.allOf.map(formatInnerSchema as any).join(' & ');
    }
    if (schema.oneOf) {
      return schema.oneOf.map(formatInnerSchema as any).join(' | ');
    }
    if (schema.anyOf) {
      return schema.anyOf.map(formatInnerSchema as any).join(' | ');
    }
    return JSON.stringify(schema, null, 2);
  }

  formatValidationError(err: SchemaValidationError): string {
    const dataPath = `${this.type}${err.dataPath}`;
    if (!err.parentSchema) {
      return '';
    }
    if (err.keyword === 'additionalProperties') {
      const baseMessage = `${dataPath} has an unknown property '${
        (err.params as Ajv.AdditionalPropertiesParams).additionalProperty
      }'. These properties are valid:\n${this.getSchemaPartText(
        err.parentSchema
      )}`;
      return baseMessage;
    } else if (err.keyword === 'oneOf' || err.keyword === 'anyOf') {
      if (err.children && err.children.length > 0) {
        if (err.schema.length === 1) {
          const lastChild = err.children[err.children.length - 1];
          const remainingChildren = err.children.slice(
            0,
            err.children.length - 1
          );
          return this.formatValidationError(
            Object.assign({}, lastChild, {
              children: remainingChildren,
              parentSchema: Object.assign(
                {},
                err.parentSchema,
                lastChild.parentSchema
              )
            })
          );
        }
        const children = this.filterChildren(err.children);
        if (children.length === 1) {
          return this.formatValidationError(children[0]);
        }
        return (
          `${dataPath} should be one of these:\n${this.getSchemaPartText(
            err.parentSchema
          )}\n` +
          `Details:\n${children
            .map(
              (err: SchemaValidationError) =>
                ' * ' + indent(this.formatValidationError(err), '   ', false)
            )
            .join('\n')}`
        );
      }
      return `${dataPath} should be one of these:\n${this.getSchemaPartText(
        err.parentSchema
      )}`;
    } else if (err.keyword === 'enum') {
      if (
        err.parentSchema &&
        err.parentSchema.enum &&
        err.parentSchema.enum.length === 1
      ) {
        return `${dataPath} should be ${this.getSchemaPartText(
          err.parentSchema
        )}`;
      }
      return `${dataPath} should be one of these:\n${this.getSchemaPartText(
        err.parentSchema
      )}`;
    } else if (err.keyword === 'allOf') {
      return `${dataPath} should be:\n${this.getSchemaPartText(
        err.parentSchema
      )}`;
    } else if (err.keyword === 'type') {
      switch ((err.params as Ajv.TypeParams).type) {
        case 'object':
          return `${dataPath} should be an object.${this.getSchemaPartDescription(
            err.parentSchema
          )}`;
        case 'string':
          return `${dataPath} should be a string.${this.getSchemaPartDescription(
            err.parentSchema
          )}`;
        case 'boolean':
          return `${dataPath} should be a boolean.${this.getSchemaPartDescription(
            err.parentSchema
          )}`;
        case 'number':
          return `${dataPath} should be a number.${this.getSchemaPartDescription(
            err.parentSchema
          )}`;
        case 'array':
          return `${dataPath} should be an array:\n${this.getSchemaPartText(
            err.parentSchema
          )}`;
      }
      return `${dataPath} should be ${
        (err.params as Ajv.TypeParams).type
      }:\n${this.getSchemaPartText(err.parentSchema)}`;
    } else if (err.keyword === 'instanceof') {
      return `${dataPath} should be an instance of ${this.getSchemaPartText(
        err.parentSchema
      )}`;
    } else if (err.keyword === 'required') {
      const missingProperty = (err.params as Ajv.RequiredParams).missingProperty.replace(
        /^\./,
        ''
      );
      return `${dataPath} misses the property '${missingProperty}'.\n${this.getSchemaPartText(
        err.parentSchema,
        ['properties', missingProperty]
      )}`;
    } else if (err.keyword === 'minimum') {
      return `${dataPath} ${err.message}.${this.getSchemaPartDescription(
        err.parentSchema
      )}`;
    } else if (err.keyword === 'uniqueItems') {
      return `${dataPath} should not contain the item '${
        err.data[(err.params as Ajv.UniqueItemsParams).i]
      }' twice.${this.getSchemaPartDescription(err.parentSchema)}`;
    } else if (
      err.keyword === 'minLength' ||
      err.keyword === 'minItems' ||
      err.keyword === 'minProperties'
    ) {
      if ((err.params as Ajv.LimitParams).limit === 1) {
        switch (err.keyword) {
          case 'minLength':
            return `${dataPath} should be an non-empty string.${this.getSchemaPartDescription(
              err.parentSchema
            )}`;
          case 'minItems':
            return `${dataPath} should be an non-empty array.${this.getSchemaPartDescription(
              err.parentSchema
            )}`;
          case 'minProperties':
            return `${dataPath} should be an non-empty object.${this.getSchemaPartDescription(
              err.parentSchema
            )}`;
        }
        return `${dataPath} should be not empty.${this.getSchemaPartDescription(
          err.parentSchema
        )}`;
      } else {
        return `${dataPath} ${err.message}${this.getSchemaPartDescription(
          err.parentSchema
        )}`;
      }
    } else {
      return `${dataPath} ${err.message} (${JSON.stringify(
        err,
        null,
        2
      )}).\n${this.getSchemaPartText(err.parentSchema)}`;
    }
  }
  getSchemaPart(path: string | string[]) {
    path = (<string>path).split('/');
    path = path.slice(0, path.length);
    let schemaPart = this.schema;
    for (let i = 1; i < path.length; i++) {
      const inner = schemaPart[path[i]];
      if (inner) schemaPart = inner;
    }
    return schemaPart;
  }

  getSchemaPartText(schemaPart: Schema, additionalPath?: string[]) {
    if (additionalPath) {
      for (let i = 0; i < additionalPath.length; i++) {
        const inner = schemaPart[additionalPath[i]];
        if (inner) schemaPart = inner;
      }
    }
    while (schemaPart.$ref) {
      schemaPart = this.getSchemaPart(schemaPart.$ref);
    }
    let schemaText = this.formatSchema(schemaPart);
    if (schemaPart.description) {
      schemaText += `\n-> ${schemaPart.description}`;
    }
    return schemaText;
  }

  getSchemaPartDescription(schemaPart: Schema) {
    while (schemaPart.$ref) {
      schemaPart = this.getSchemaPart(schemaPart.$ref);
    }
    if (schemaPart.description) {
      return `\n-> ${schemaPart.description}`;
    }
    return '';
  }

  SPECIFICITY: { [key: string]: number } = {
    type: 1,
    oneOf: 1,
    anyOf: 1,
    allOf: 1,
    additionalProperties: 2,
    enum: 1,
    instanceof: 1,
    required: 2,
    minimum: 2,
    uniqueItems: 2,
    minLength: 2,
    minItems: 2,
    minProperties: 2,
    absolutePath: 2
  };

  filterMax(array: SchemaValidationError[], fn: Function) {
    const max = array.reduce((max, item) => Math.max(max, fn(item)), 0);
    return array.filter(item => fn(item) === max);
  }

  filterChildren(children: SchemaValidationError[]) {
    children = this.filterMax(children, (err: SchemaValidationError) =>
      err.dataPath ? err.dataPath.length : 0
    );
    children = this.filterMax(
      children,
      (err: SchemaValidationError) => this.SPECIFICITY[err.keyword] || 2
    );
    return children;
  }
}
