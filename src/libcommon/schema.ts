export function serialize<Type>(o: Type, _schema: Object): String {
  return JSON.stringify(o);
}

export function parse<Type>(o: string, _schema: Object): Type {
  return JSON.parse(o);
}

export function validate<_Type>(_o: Object, _schema: Object): boolean {
  return true;
}

export function convert<Type>(_o: Object, _schema: Object): Type | null {
  if (validate(_o, _schema)) {
    return <Type>_o;
  }
  return null;
}

export function compileSerializer<Type>(schema: Object) {
  return (o: Type) => serialize<Type>(o, schema);
}

export function compileParser<Type>(schema: Object) {
  return (o: string) => parse<Type>(o, schema);
}

export function compileValidator<Type>(schema: Object) {
  return (o: Object) => validate<Type>(o, schema);
}

export function compileConverter<Type>(schema: Object) {
  return (o: Object) => convert<Type>(o, schema);
}

interface Property {
  type: string;
}

interface Schema {
  properties: Record<string, Property>;
}

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

export function transform<T>(
  inp: string | Object,
  target: T,
  schema: Schema
): T | null {
  if (target === null) {
    return null;
  }
  if (schema === undefined) {
    return null;
  }
  const properties = schema.properties;
  if (properties === undefined) {
    return null;
  }
  if (typeof inp === "string") {
    return transform<T>(JSON.parse(inp), target, schema);
  }
  if (!_validate(inp, target, schema)) {
    return null;
  }
  for (const property in schema.properties) {
    //@ts-ignore
    target[property] = inp[property];
  }
  return target;
}
