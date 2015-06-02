import {Record} from 'immutable';
import isConnection from '../../schema/fields/isConnection';
/**
 * Validator that checks that there is a connection field with parameter's
 * name, for a type with typeParameter's name.
 */
export default class IsConnectionValidator extends Record({
  typeParameter: undefined,
}) {
  validate(schema, name, parameters) {
    let existingType = schema.types.get(parameters.get(this.typeParameter));
    if (existingType) {
      let existingField = existingType.fields.get(name);
      if (!existingField) {
        throw new Error(
          `Type "${existingType.name}" does not have a field "${name}".`
        );
      } else if (!isConnection(existingField)) {
        throw new Error(
          `Field "${name}" of "${existingType.name}" is not a connection. ` +
          `Expected a connection field.`
        );
      }
    }
    return true;
  }
}