import { transform } from "../src/libcommon/schema";
import { expect, test, describe } from "vitest";

class FooBar {
  foo: string;

  static schema = {
    properties: {
      foo: { type: "string" },
    },
  };

  constructor(foo?: string) {
    this.foo = foo ?? "";
  }
}

describe("transform", () => {
  test("a valid string", () => {
    let s = '{"foo": "bar"}';
    let a = transform<FooBar>(s, new FooBar(), FooBar.schema);
    expect(a).not.toBe(null);
    expect(a?.foo).toBe("bar");
  });
  test("a valid object", () => {
    let s = { foo: "bar" };
    let a = transform<FooBar>(s, new FooBar(), FooBar.schema);
    expect(a).not.toBe(null);
    expect(a?.foo).toBe("bar");
  });
  test("a wrong type", () => {
    let s = { foo: 123 };
    let a = transform<FooBar>(s, new FooBar(), FooBar.schema);
    expect(a).toBe(null);
  });
  test("a missing field", () => {
    let s = {};
    let a = transform<FooBar>(s, new FooBar(), FooBar.schema);
    expect(a).toBe(null);
  });
});
