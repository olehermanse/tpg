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

function name_lookup<T extends SchemaClass>(new_object: T): string {
  let name = undefined;
  let class_name = undefined;
  if (new_object.class_name != undefined) {
    class_name = new_object.class_name();
  }
  if (new_object.constructor.name != undefined) {
    name = new_object.constructor.name;
  }
  if (class_name != undefined && name != undefined) {
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

export function validate<T extends SchemaClass>(
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
  inp: T,
  target: Record<string, any>,
  schema: Schema,
  nesting: NestingMode
): any {
  for (const property in schema.properties) {
    const t = schema.properties[property].type;
    if (t === undefined) {
      target[property] = inp[property];
      continue;
    }
    if (schema.properties[property].array === true) {
      target[property] = new Array();
      for (let x of inp[property]) {
        target[property].push(_copy_single_element(x, t, nesting));
      }
      continue;
    }
    target[property] = _copy_single_element(inp[property], t, nesting);
  }
  return target;
}

export function copy<T extends SchemaClass>(inp: T): T {
  //@ts-ignore
  const new_object = new inp.constructor();
  return _copy(inp, new_object, new_object.schema(), "class");
}

// Convert a string or plain Object into class according to schema
export function convert<T extends SchemaClass>(
  inp: string | Object,
  new_object: T
): T | null {
  if (typeof inp === "string") {
    return convert<T>(JSON.parse(inp), new_object);
  }
  if (!validate(inp, new_object)) {
    return null;
  }
  return _copy(<T>inp, new_object, new_object.schema(), "class");
}

export function objectify(inp: SchemaClass): Object {
  const schema = inp.schema();
  let target = new Object();
  return <Object>_copy(inp, target, schema, "object");
}

export function stringify(inp: any): string {
  return JSON.stringify(objectify(inp));
}
