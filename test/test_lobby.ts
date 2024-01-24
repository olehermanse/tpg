import { Message, Chat, Lobby } from "../src/libcommon/lobby";
import { expect, test, describe } from "vitest";

describe("Message", () => {
  test("constructor", () => {
    // For empty string or strings which already have spaces
    // do nothing, no-op
    const message = new Message("Some user", "Some message");
    expect(message.username).toBe("Some user");
    expect(message.body).toBe("Some message");
  });
  test("from", () => {
    const source = new Message("a", "b");
    let message = Message.from(source); // from a Message instance
    source.username = "c";
    source.body = "d";
    expect(message.username).toBe("a");
    expect(message.body).toBe("b");

    message = Message.from(source.json); // from a serialized JSON
    expect(message.username).toBe("c");
    expect(message.body).toBe("d");

    source.username = "e";
    source.body = "f";
    message = Message.from(source.object); // from a key-value object
    expect(message.username).toBe("e");
    expect(message.body).toBe("f");
  });
  test("object", () => {
    const source = new Message("x", "y");
    expect(source).toBeTypeOf("object");
    expect(source).toBeInstanceOf(Message);

    const obj = source.object;
    expect(obj).toBeTypeOf("object");
    expect(obj).not.toBeInstanceOf(Message);
    expect(obj.username).toBe("x");
    expect(obj.body).toBe("y");
  });
  test("json", () => {
    const source = new Message("Alice", "Hello, world!");
    expect(source).toBeTypeOf("object");
    expect(source).toBeInstanceOf(Message);

    const json_string = source.json;
    expect(json_string).toContain("Alice");
    expect(json_string).toContain("Hello, world!");

    const obj = JSON.parse(json_string);
    expect(obj.username).toBe("Alice");
    expect(obj.body).toBe("Hello, world!");

    const final = Message.from(obj);
    expect(final.username).toBe("Alice");
    expect(final.body).toBe("Hello, world!");
  });
});

describe("Chat", () => {
  test("constructor", () => {
    const chat = new Chat();
    expect(chat).toBeInstanceOf(Chat);
    expect(chat.messages).toHaveLength(0);
  });
  test("add", () => {
    const chat = new Chat();
    chat.add("Alice", "Hello, world!");
    expect(chat.messages).toHaveLength(1);
    expect(chat.messages[0].username).toBe("Alice");
    expect(chat.messages[0].body).toBe("Hello, world!");
  });
  test("object", () => {
    const chat = new Chat();
    chat.add("Alice", "Hello, world!");

    let obj = chat.object;
    expect(obj).toBeInstanceOf(Object);
    expect(obj.messages).toBeInstanceOf(Array);
    expect(obj.messages).toHaveLength(1);
    expect(obj.messages[0]).toBeInstanceOf(Object);
    expect(obj.messages[0].username).toBe("Alice");
    expect(obj.messages[0].body).toBe("Hello, world!");

    chat.add("Bob", "Hello, world!");
    expect(obj.messages).toHaveLength(1);
    obj = chat.object;
    expect(obj.messages).toHaveLength(2);
    expect(obj.messages[0]).toBeInstanceOf(Object);
    expect(obj.messages[0].username).toBe("Alice");
    expect(obj.messages[0].body).toBe("Hello, world!");
    expect(obj.messages[1]).toBeInstanceOf(Object);
    expect(obj.messages[1].username).toBe("Bob");
    expect(obj.messages[1].body).toBe("Hello, world!");

    chat.add("foo", "bar");
    expect(obj.messages).toHaveLength(2);
    obj = chat.object;
    expect(obj.messages).toHaveLength(3);
    expect(obj.messages[0]).toBeInstanceOf(Object);
    expect(obj.messages[0].username).toBe("Alice");
    expect(obj.messages[0].body).toBe("Hello, world!");
    expect(obj.messages[1]).toBeInstanceOf(Object);
    expect(obj.messages[1].username).toBe("Bob");
    expect(obj.messages[1].body).toBe("Hello, world!");
    expect(obj.messages[2]).toBeInstanceOf(Object);
    expect(obj.messages[2].username).toBe("foo");
    expect(obj.messages[2].body).toBe("bar");
  });
  test("json", () => {
    const chat = new Chat();
    chat.add("a", "b");
    chat.add("c", "d");
    chat.add("e", "f");
    const obj = JSON.parse(chat.json);
    expect(obj.messages).toHaveLength(3);
    expect(obj.messages[0].username).toBe("a");
    expect(obj.messages[0].body).toBe("b");
    expect(obj.messages[1].username).toBe("c");
    expect(obj.messages[1].body).toBe("d");
    expect(obj.messages[2].username).toBe("e");
    expect(obj.messages[2].body).toBe("f");
  });
});

describe("Lobby", () => {
  test("constructor", () => {
    const lobby = new Lobby("1234");
    expect(lobby).toBeInstanceOf(Lobby);
    expect(lobby.path).toBe("1234");
    expect(lobby.chat).toBeInstanceOf(Chat);
    expect(lobby.games).toHaveLength(1);
  });
  test("object", () => {
    const lobby = new Lobby("5678");
    const obj = lobby.object;
    expect(obj).toBeInstanceOf(Object);
    expect(obj.path).toBe(lobby.path);
    expect(obj.chat).toBeInstanceOf(Object);
    expect(obj.games).toHaveLength(lobby.games.length);
    expect(obj.games).toBeInstanceOf(Array);
  });
  test("json", () => {
    const lobby = new Lobby("5678");
    const obj = JSON.parse(lobby.json);
    expect(obj).toBeInstanceOf(Object);
    expect(obj.path).toBe(lobby.path);
    expect(obj.chat).toBeInstanceOf(Object);
    expect(obj.games).toHaveLength(lobby.games.length);
    expect(obj.games).toBeInstanceOf(Array);
  });
});
