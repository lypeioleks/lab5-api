import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({
  allErrors: true
});

addFormats(ajv);

export function expectSchema(data: unknown, schema: object) {
  const validate = ajv.compile(schema);
  const valid = validate(data);

  if (!valid) {
    throw new Error(
      `JSON Schema validation failed:\n${ajv.errorsText(validate.errors, {
        separator: '\n'
      })}`
    );
  }
}