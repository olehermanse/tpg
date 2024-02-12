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
