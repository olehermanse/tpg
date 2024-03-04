import { get_random_userid, text_wrap } from "../src/libcommon/utils";
import { describe, expect, test } from "vitest";

describe("get_random_userid", () => {
  test("type", () => {
    const a = get_random_userid();
    expect(a).toBeTypeOf("string");
  });
  test("unique", () => {
    const a = get_random_userid();
    for (let i = 0; i < 1000; i++) {
      const b = get_random_userid();
      expect(b).toBeTypeOf(typeof a);
      expect(b).toHaveLength(a.length);
      expect(a).not.toBe(b);
    }
  });
  test("length", () => {
    const a = get_random_userid();
    expect(a).toHaveLength(14);
  });
});

describe("text_wrap", () => {
  test("no-op", () => {
    // For empty string or strings which already have spaces
    // do nothing, no-op
    expect(text_wrap("", 2)).toBe("");
    expect(text_wrap("\n", 2)).toBe("\n");
    expect(text_wrap("\n\n", 2)).toBe("\n\n");
    expect(text_wrap("\n \n", 2)).toBe("\n \n");
    expect(text_wrap("  \n  \n", 2)).toBe("  \n  \n");
  });
  test("trim", () => {
    expect(text_wrap("a ", 20)).toBe("a");
    expect(text_wrap(" a ", 20)).toBe("a");
    expect(text_wrap("   abc    ", 20)).toBe("abc");
    expect(text_wrap("   abc def    ", 8)).toBe("abc def");
    expect(text_wrap("   abc  def    ", 8)).toBe("abc def");
  });
  test("split 2 words", () => {
    expect(text_wrap("a b", 1)).toBe("a\nb");
    expect(text_wrap("a b", 2)).toBe("a\nb");
    expect(text_wrap("a b", 3)).toBe("a b");
    expect(text_wrap("ab cd", 3)).toBe("ab\ncd");
    expect(text_wrap("abc def", 3)).toBe("abc\ndef");
    expect(text_wrap("abc def", 4)).toBe("abc\ndef");
    expect(text_wrap("abc def", 5)).toBe("abc\ndef");
    expect(text_wrap("abc def", 6)).toBe("abc\ndef");
    expect(text_wrap("abc def", 7)).toBe("abc def");
  });
  test("fragments with dashes", () => {
    expect(text_wrap("abc", 3)).toBe("abc");
    expect(text_wrap("abcd", 3)).toBe("ab-\ncd");
    expect(text_wrap("abcdefghijklmnopqrstuv", 4)).toBe(
      "abc-\ndef-\nghi-\njkl-\nmno-\npqr-\nstu-\nv",
    );
    expect(text_wrap("A brown fox.", 7)).toBe("A brown\nfox.");
    expect(text_wrap("A brown fox.", 5)).toBe("A\nbrown\nfox.");
    expect(text_wrap("abcdefghij 123 456.", 8)).toBe("abcdefg-\nhij 123\n456.");
  });
  test("reuse dashes for fragments", () => {
    expect(text_wrap("abc-def", 4)).toBe("abc-\ndef");
    expect(text_wrap("abc-def", 5)).toBe("abc-\ndef");
    expect(text_wrap("ab-cd-ef", 4)).toBe("ab-\ncd-\nef");
  });
});
