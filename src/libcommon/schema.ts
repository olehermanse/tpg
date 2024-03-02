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

function name_lookup(cls: any): string {
  if (cls.class_name === undefined) {
    return cls.name;
  }
  if (cls.class_name === cls.name) {
    return cls.name;
  }
  return `${cls.name} / ${cls.class_name}`;
}

export function validate(inp: Record<string, any> | string, cls: any): boolean {
  if (typeof inp === "string") {
    return validate(JSON.parse(inp), cls);
  }
  const schema = cls.schema;
  for (const property in schema.properties) {
    if (!(property in inp)) {
      console.log(
        'Error: missing property "' + property + '" for ' + String(cls.name)
      );
      return false;
    }
    const schema_type = schema.properties[property].type;
    const actual_type = type_of(inp[property]);
    if (schema.properties[property].array === true) {
      if (actual_type != "instance Array") {
        console.log(`Error: property "${property}" is not an array`);
        return false;
      }
      for (let x of inp[property]) {
        const success = validate(x, schema_type);
        if (!success) {
          return false;
        }
      }
      continue;
    }
    if (is_class(schema_type)) {
      if (actual_type === "instance Object") {
        // Let's try to validate the object according to the class schema:
        const success = validate(inp[property], schema_type);
        if (!success) {
          return false;
        }
        continue;
      }
      // NOTE: We don't do recursive validation when
      // a child is the correct class, assume it was
      // created by a schema-correct function
      const class_name = schema_type.name;
      if (actual_type != "instance " + class_name) {
        console.log(
          `Error: incorrect class type on "${property}" ` +
            `for ${name_lookup(cls)} ` +
            `(${name_lookup(schema_type)} vs ${actual_type})`
        );
      }
    } else if (!(schema_type === actual_type)) {
      console.log(
        `Error: incorrect simple type on "${property}" ` +
          `for ${name_lookup(cls)} ` +
          `(${schema_type} vs ${actual_type})`
      );
      return false;
    }
  }
  return true;
}

function _copy_single_element(inp: any, t: any, nesting: string) {
  // Deep copying classes with new instances of same class
  if (nesting === "class" && is_class(t)) {
    //@ts-ignore
    return instantiate(inp, t);
  }
  if (nesting === "object" && is_class(t)) {
    // We've found a class, and we'd like to do a deep copy
    // but convert to simple Object()
    //@ts-ignore
    return inp.objectify();
  }
  console.assert(!is_class(t) || nesting === "assign");
  //@ts-ignore
  return inp;
}

function _copy<T>(inp: T, target: any, schema: any, nesting: string) {
  for (const property in schema.properties) {
    const t = schema.properties[property].type;
    if (t === undefined) {
      //@ts-ignore
      target[property] = inp[property];
      continue;
    }
    if (schema.properties[property].array === true) {
      target[property] = new Array();
      //@ts-ignore
      for (let x of inp[property]) {
        target[property].push(_copy_single_element(x, t, nesting));
      }
      continue;
    }
    //@ts-ignore
    target[property] = _copy_single_element(inp[property], t, nesting);
  }
}

export function copy<T>(inp: T, cls: any): T {
  const schema = cls.schema;
  let target = new cls();
  _copy<T>(inp, target, schema, "class");
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

export function objectify(inp: any): Object {
  const schema = inp.constructor.schema;
  let target = new Object();
  _copy(inp, target, schema, "object");
  return target;
}

export function stringify(inp: any): string {
  return JSON.stringify(inp.objectify());
}
