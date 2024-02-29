// An experiment in trying to determine the "type" of something

class Mock extends Object {
  userid: string;
  username: string;
}

function type_of_extended(a: any): string[] {
  const to = typeof a;
  if (["string", "number", "boolean", "null", "undefined"].includes(to)) {
    return [to];
  }
  if (to === "function" && a.prototype) {
    if (Object.getOwnPropertyDescriptor(a, "prototype")?.writable) {
      return ["function"];
    }
    return ["class", a.name];
  }
  if (to === "function" && a instanceof Object) {
    return ["function"];
  }
  if (a instanceof Object && a.constructor && a.constructor.name) {
    return [a.constructor.name, "instance"];
  }
  return ["Unknown"];
}

function type_of(a: any): string {
  return type_of_extended(a)[0];
}

function wrapper(rep: string, actual: any) {
  console.log("type_of(" + rep + ") = " + type_of(actual));
}

wrapper("3", 3);
wrapper("'foo'", "foo");
wrapper("true", true);
wrapper("false", false);
wrapper("[]", []);
wrapper("{}", {});
wrapper("wrapper", wrapper);
wrapper("Mock", Mock);
wrapper("Object", Object);
wrapper("Array", Array);
wrapper("new Mock()", new Mock());

// Output:
// type_of(3) = number
// type_of('foo') = string
// type_of(true) = boolean
// type_of(false) = boolean
// type_of([]) = Array
// type_of({}) = Object
// type_of(wrapper) = function
// type_of(Mock) = class
// type_of(Object) = class
// type_of(Array) = class
// type_of(new Mock()) = Mock
