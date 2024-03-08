export type Class<T = any> = {
  new (...args: any[]): T;
  name: string;
};

export type NestingMode = "class" | "object" | "assign";

export interface Selector {
  (data: Record<string, any>): Class<SchemaClass> | null;
}

export interface Property {
  type: string | Class | Selector | undefined;
  array?: boolean;
  // selector?: Selector;
}

export interface Schema {
  properties: Record<string, Property>;
}

export abstract class SchemaClass {
  abstract schema(): Schema;
  abstract class_name?(): string;
  constructor() {}
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

export function is_function(a: any) {
  return type_of(a) === "function";
}

export function is_simple(a: any): boolean {
  return !(is_class(a) || is_instance(a) || is_function(a));
}

function name_lookup_class(cls: Class<SchemaClass>): string {
  const tmp = new cls();
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

export function is_valid<T extends SchemaClass>(
  inp: Record<string, any> | string,
  new_object: T,
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

  if (result instanceof Error) {
    return false;
  }
  return true;
}

export function assertion(condition: boolean, message: string): boolean {
  console.assert(condition, message);
  if (condition === true) {
    return true;
  }
  return false;
}

function _copy_single_element(
  inp: any,
  t: string | Class,
  nesting: NestingMode,
): any {
  // Deep copying classes with new instances of same class
  if (nesting === "class" && is_class(t)) {
    const cls = <Class> t;
    return to_class(inp, new cls());
  }
  if (nesting === "object" && is_class(t)) {
    // We've found a class, and we'd like to do a deep copy
    // but convert to simple Object() instead of class instance
    const instance = <SchemaClass> inp;
    return to_object(instance);
  }
  console.assert(!is_class(t) || nesting === "assign");
  return inp;
}

function _copy<T extends SchemaClass>(
  inp: Record<string, any>,
  target: WriteableStringAnyDict,
  schema: Schema,
  nesting: NestingMode,
): T | object | Error {
  for (const property in schema.properties) {
    if (!(property in inp)) {
      return new Error(
        `Error: missing property "${property}" for ${name_lookup(target)}`,
      );
    }
    const schema_type = schema.properties[property].type;
    if (schema_type === undefined) {
      target[property] = inp[property];
      continue; // Disabled validation, simple assignment
    }
    const actual = inp[property];
    // Handle arrays first:
    if (schema.properties[property].array === true) {
      if (!is_instance(actual, "Array")) {
        return new Error(`Error: property "${property}" is not an array`);
      }
      if (typeof schema_type === "string") {
        // schema_type = 'string', 'number', 'null', 'boolean', 'undefined'...
        target[property] = [];
        for (const x of actual) {
          if (type_of(x) != schema_type) {
            return new Error(
              `Error: Found invalid type in simple array for ${property} (${
                type_of(
                  x,
                )
              } vs ${schema_type})`,
            );
          }
          target[property].push(x);
        }
      }
      target[property] = [];
      for (const x of actual) {
        let element_type: any = schema_type;
        if (type_of(element_type) === "function") {
          element_type = (<Selector> element_type)(x);
        }
        if (element_type === null) {
          return new Error(
            `Error: unable to select the type for element of array '${property}'`,
          );
        }
        const y = _copy_single_element(x, element_type, nesting);
        if (y instanceof Error) {
          return y;
        }
        target[property].push(y);
      }
      continue;
    }
    // Here we handle a function selector:
    if (type_of(schema_type) === "function") {
      const selector = <Selector> schema_type;
      const schema_class = selector(actual);
      if (schema_class === null) {
        return new Error(`Error: unrecognized type for "${property}" `);
      }
      const class_name = schema_class.name;
      if (!is_instance(actual, "Object") && !is_instance(actual, class_name)) {
        return new Error(
          `Error: incorrect class type on "${property}" ` +
            `for ${name_lookup(inp)} ` +
            `(${name_lookup_class(schema_class)} vs ${type_of(actual)})`,
        );
      }
      const new_target = new schema_class();
      const result = _copy(actual, new_target, new_target.schema(), nesting);
      if (result instanceof Error) {
        return result;
      }
      target[property] = result;
      continue;
    }
    // Here we handle a class, which has its own schema:
    if (is_class(schema_type)) {
      const schema_class = <Class> schema_type;
      const class_name = schema_class.name;
      if (!is_instance(actual, "Object") && !is_instance(actual, class_name)) {
        return new Error(
          `Error: incorrect class type on "${property}" ` +
            `for ${name_lookup(inp)} ` +
            `(${name_lookup_class(schema_class)} vs ${type_of(actual)})`,
        );
      }
      const new_target = new schema_class();
      const result = _copy(actual, new_target, new_target.schema(), nesting);
      if (result instanceof Error) {
        return result;
      }
      target[property] = result;
      continue;
    }
    // Simple types:
    if (!(schema_type === type_of(actual))) {
      return new Error(
        `Error: incorrect simple type on "${property}" ` +
          `for ${name_lookup(inp)} ` +
          `(${schema_type} vs ${type_of(actual)})`,
      );
    }
    target[property] = inp[property];
    // Continue to next property of schema.properties
  }
  return target;
}

export function copy<T extends SchemaClass>(inp: T, new_object: T): T {
  return <T> _copy(inp, new_object, new_object.schema(), "class");
}

// Convert a string or plain Object into class according to schema
export function to_class<T extends SchemaClass>(
  inp: string | object,
  new_object: T,
): T | Error {
  if (typeof inp === "string") {
    return to_class<T>(JSON.parse(inp), new_object);
  }
  return <T | Error> _copy(inp, new_object, new_object.schema(), "class");
}

export function to_class_selector<T extends SchemaClass>(
  inp: string | object,
  selector: Selector,
) {
  if (typeof inp === "string") {
    return to_class_selector<T>(JSON.parse(inp), selector);
  }
  const constructor = selector(inp);
  if (constructor === null) {
    return Error("Unable to select class");
  }
  const new_object = new constructor();
  return <T | Error> _copy(inp, new_object, new_object.schema(), "class");
}

export function to_object(inp: SchemaClass): object {
  const schema = inp.schema();
  const target = new Object();
  const object = <object> _copy(inp, target, schema, "object");
  if (object instanceof Error) {
    console.log("Unexpected error in to_object:");
    console.log(object);
  }
  return <object> object;
}

export function to_string(inp: SchemaClass, pretty?: boolean): string {
  if (pretty === true) {
    return JSON.stringify(to_object(inp), null, 2);
  }
  return JSON.stringify(to_object(inp));
}
