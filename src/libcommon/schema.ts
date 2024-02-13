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

export function validate(inp: Record<string, any>, cls: any): boolean {
  const schema = cls.schema;
  for (const property in schema.properties) {
    if (!(property in inp)) {
      console.log(
        'Error: missing property "' + property + '" for ' + String(cls.name)
      );
      return false;
    }
    const prop = schema.properties[property];
    if (!(prop.type === typeof inp[property])) {
      console.log(
        'Error: incorrect type on "' + property + '" for ' + String(cls.name)
      );
      return false;
    }
  }
  return true;
}

export function copy<T>(inp: T, cls: any): T {
  const schema = cls.schema;
  let target = new cls();
  for (const property in schema.properties) {
    //@ts-ignore
    target[property] = inp[property];
  }
  return target;
}

export function instantiate<T>(inp: string | Object, cls: any): T | null {
  if (typeof inp === "string") {
    return instantiate<T>(JSON.parse(inp), cls);
  }
  if (!validate(inp, cls)) {
    return null;
  }
  return copy(<T>inp, cls);
}
