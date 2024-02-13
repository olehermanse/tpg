import { Schema } from "./interfaces.ts";

export function type_of(a: any): string {
  if (a === true || a === false) {
    return "boolean";
  }
  if (a === undefined) {
    return "undefined";
  }
  if (a === null) {
    return "null"; // NOTE: according to js, type of null is object
  }
  const to = typeof a;
  if (to === "number") {
    if (Number.isNaN(a)) {
      return "nan";
    }
    return "number";
  }
  if (to === "string") {
    return "string";
  }
  if (to === "function" && a.prototype) {
    if (Object.getOwnPropertyDescriptor(a, "prototype")?.writable) {
      return "function";
    }
    return "class " + a.name;
  }
  if (to === "function" && a instanceof Object) {
    return "function";
  }
  if (a instanceof Object && a.constructor && a.constructor.name) {
    return "instance " + a.constructor.name;
  }
  return "Unknown";
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

export function validate(
  inp: Record<string, any>,
  target: any,
  schema: Schema
): boolean {
  for (const property in schema.properties) {
    if (!(property in inp)) {
      console.log(
        'Error: missing property "' + property + '" for ' + String(target)
      );
      return false;
    }
    const prop = schema.properties[property];
    if (!(prop.type === typeof inp[property])) {
      console.log(
        'Error: incorrect type on "' + property + '" for ' + String(target)
      );
      return false;
    }
  }
  return true;
}

export function copy<T>(inp: T, target: T, schema: Schema): T {
  for (const property in schema.properties) {
    //@ts-ignore
    target[property] = inp[property];
  }
  return target;
}

export function instantiate<T>(
  inp: string | Object,
  target: T,
  schema: Schema
): T | null {
  if (typeof inp === "string") {
    return instantiate<T>(JSON.parse(inp), target, schema);
  }
  if (!validate(inp, target, schema)) {
    return null;
  }
  return copy(<T>inp, target, schema);
}
