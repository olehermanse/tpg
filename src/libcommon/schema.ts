import { Schema } from "./interfaces.ts";

function _validate(
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
  if (!_validate(inp, target, schema)) {
    return null;
  }
  return copy(<T>inp, target, schema);
}
