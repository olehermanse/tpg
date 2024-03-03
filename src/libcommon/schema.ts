type Class<T = any> = {
  new (...args: any[]): T;
  name: string;
};

type NestingMode = "class" | "object" | "assign";

export interface Property {
  type: string | Class | undefined;
  array?: boolean;
}

export interface Schema {
  properties: Record<string, Property>;
}

export interface SchemaClass extends Record<string, any> {
  schema(): Schema;
  class_name?(): string;
}

export interface WriteableStringAnyDict {
  [index: string]: any;
}

export function type_of(a: any): string {
  // Check for known values:
  if (a === true || a === false) {
    return "boolean";
  }
  if (a === undefined) {
    return "undefined";
  }
  if (a === null) {
    return "null"; // NOTE: typeof would give object
  }
  // Basic typeof checking:
  if (typeof a === "number") {
    if (Number.isNaN(a)) {
      return "nan"; // Seems useful to have nan as a special type?
    }
    return "number";
  }
  if (typeof a === "string") {
    return "string";
  }
  // Functions, classes and instances are kinda special:
  if (typeof a === "function" && a.prototype) {
    if (Object.getOwnPropertyDescriptor(a, "prototype")?.writable) {
      return "function";
    }
    return "class " + a.name;
  }
  if (a instanceof Object && a.constructor && a.constructor.name) {
    return "instance " + a.constructor.name;
  }
  return ""; // No type info determined
}

export function is_class(a: any, name?: string): boolean {
  const t = type_of(a);
  if (!t.startsWith("class ")) {
    return false; // Not a class
  }
  if (name === undefined) {
    return true; // Is a class and no name to match
  }
  // Match name:
  return t === "class " + name;
}

export function is_instance(a: any, name?: string): boolean {
  const t = type_of(a);
  if (!t.startsWith("instance ")) {
    return false; // Not an instance
  }
  if (name === undefined) {
    return true; // Is an instance and no name to match
  }
  // Match name:
  return t === "instance " + name;
}

function name_lookup_class(cls: Class<SchemaClass>): string {
  let tmp = new cls();
  return name_lookup(tmp);
}

function name_lookup(new_object: any): string {
  let name = undefined;
  let class_name = undefined;
  if (new_object.class_name != undefined) {
    class_name = new_object.class_name();
  }
  if (new_object.constructor.name != undefined) {
    name = new_object.constructor.name;
  }
  if (class_name != undefined && name != undefined) {
    if (class_name === name) {
      return `${name}`;
    }
    return `${name} / ${class_name}`;
  }
  if (name != undefined) {
    return name;
  }
  if (class_name != undefined) {
    return class_name;
  }
  return "<Unknown>";
}

export function old_validate<T extends SchemaClass>(
  inp: Record<string, any> | string,
  new_object: T
): boolean {
  if (typeof inp === "string") {
    return validate(JSON.parse(inp), new_object);
  }
  const schema = new_object.schema();
  for (const property in schema.properties) {
    if (!(property in inp)) {
      console.log(
        'Error: missing property "' +
          property +
          '" for ' +
          name_lookup(new_object)
      );
      return false;
    }
    const schema_type = schema.properties[property].type;
    if (schema_type === undefined) {
      return true; // Setting type to undefined disables validation
    }
    const actual_type = type_of(inp[property]);
    if (schema.properties[property].array === true) {
      if (actual_type != "instance Array") {
        console.log(`Error: property "${property}" is not an array`);
        return false;
      }
      if (typeof schema_type === "string") {
        console.log(`Error: arrays of simple types not supported yet`);
        return false;
      }
      for (let x of inp[property]) {
        const success = validate(x, new schema_type());
        if (!success) {
          return false;
        }
      }
      continue;
    }
    if (is_class(schema_type)) {
      const schema_class = <Class>schema_type;
      if (actual_type === "instance Object") {
        // Let's try to validate the object according to the class schema:
        const success = validate(inp[property], new schema_class());
        if (!success) {
          return false;
        }
        continue;
      }
      // NOTE: We don't do recursive validation when
      // a child is the correct class, assume it was
      // created by a schema-correct function
      const class_name = schema_class.name;
      if (actual_type != "instance " + class_name) {
        console.log(
          `Error: incorrect class type on "${property}" ` +
            `for ${name_lookup(new_object)} ` +
            `(${name_lookup_class(schema_class)} vs ${actual_type})`
        );
      }
    } else if (!(schema_type === actual_type)) {
      console.log(
        `Error: incorrect simple type on "${property}" ` +
          `for ${name_lookup(new_object)} ` +
          `(${schema_type} vs ${actual_type})`
      );
      return false;
    }
  }
  return true;
}

export function validate<T extends SchemaClass>(
  inp: Record<string, any> | string,
  new_object: T
): boolean {
  let result = null;
  if (typeof inp === "string") {
    const parsed = JSON.parse(inp);
    if (type_of(parsed) != "instance Object") {
      return false;
    }
    result = _copy(parsed, new_object, new_object.schema(), "class");
  } else {
    result = _copy(inp, new_object, new_object.schema(), "class");
  }

  if (result === null) {
    return false;
  }
  return true;
}

function _copy_single_element(
  inp: any,
  t: string | Class,
  nesting: NestingMode
): any {
  // Deep copying classes with new instances of same class
  if (nesting === "class" && is_class(t)) {
    const cls = <Class>t;
    return convert(inp, new cls());
  }
  if (nesting === "object" && is_class(t)) {
    // We've found a class, and we'd like to do a deep copy
    // but convert to simple Object()
    //@ts-ignore
    return objectify(inp);
  }
  console.assert(!is_class(t) || nesting === "assign");
  //@ts-ignore
  return inp;
}

function _copy<T extends SchemaClass>(
  inp: Record<string, any>,
  target: WriteableStringAnyDict,
  schema: Schema,
  nesting: NestingMode
): T | Object | null {
  for (const property in schema.properties) {
    if (!(property in inp)) {
      console.log(
        'Error: missing property "' + property + '" for ' + name_lookup(target)
      );
      return null;
    }
    const schema_type = schema.properties[property].type;
    if (schema_type === undefined) {
      target[property] = inp[property];
      continue; // Setting type to undefined disables validation and copying
    }
    const actual = inp[property];
    const actual_type = type_of(actual);
    // Handle arrays first:
    if (schema.properties[property].array === true) {
      if (actual_type != "instance Array") {
        console.log(`Error: property "${property}" is not an array`);
        return null;
      }
      if (typeof schema_type === "string") {
        console.log(`Error: arrays of simple types not supported yet`);
        return null;
      }
      target[property] = new Array();
      for (let x of actual) {
        const y = _copy_single_element(x, schema_type, nesting);
        if (y === null) {
          return null;
        }
        target[property].push(y);
      }
      continue;
    }
    // Here we handle a class, which has its own schema:
    if (is_class(schema_type)) {
      const schema_class = <Class>schema_type;
      const class_name = schema_class.name;
      if (
        actual_type != "instance Object" &&
        actual_type != "instance " + class_name
      ) {
        console.log(
          `Error: incorrect class type on "${property}" ` +
            `for ${name_lookup(inp)} ` +
            `(${name_lookup_class(schema_class)} vs ${actual_type})`
        );
        return null;
      }
      const new_target = new schema_class();
      const result = _copy(actual, new_target, new_target.schema(), nesting);
      if (result === null) {
        return null;
      }
      target[property] = result;
      continue;
    }
    // Simple types:
    if (!(schema_type === actual_type)) {
      console.log(
        `Error: incorrect simple type on "${property}" ` +
          `for ${name_lookup(inp)} ` +
          `(${schema_type} vs ${actual_type})`
      );
      return null;
    }
    target[property] = inp[property];
    // Continue to next property of schema.properties
  }
  return target;
}

export function copy<T extends SchemaClass>(inp: T): T {
  //@ts-ignore
  const new_object = new inp.constructor();
  return <T>_copy(inp, new_object, new_object.schema(), "class");
}

// Convert a string or plain Object into class according to schema
export function convert<T extends SchemaClass>(
  inp: string | Object,
  new_object: T
): T | null {
  if (typeof inp === "string") {
    return convert<T>(JSON.parse(inp), new_object);
  }
  return <T | null>_copy(inp, new_object, new_object.schema(), "class");
}

export function objectify(inp: SchemaClass): Object {
  const schema = inp.schema();
  let target = new Object();
  return <Object>_copy(inp, target, schema, "object");
}

export function stringify(inp: any): string {
  return JSON.stringify(objectify(inp));
}
