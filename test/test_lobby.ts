import { User, Message, Chat, Lobby } from "../src/libcommon/lobby";
import { expect, test, describe } from "vitest";

describe("Message", () => {
  test("constructor", () => {
    // For empty string or strings which already have spaces
    // do nothing, no-op
    const message = new Message(
      new User("92345678901234", "Some user"),
      "Some message"
    );
    expect(message.user.username).toBe("Some user");
    expect(message.body).toBe("Some message");
  });
  test("from", () => {
    const source = new Message(new User("82345678901234", "a"), "b");
    let message: Message = <Message>Message.instantiate(source); // from a Message instance
    expect(message).not.toBe(null);

    source.user.username = "c";
    source.body = "d";
    expect(message.user.username).toBe("a");
    expect(message.body).toBe("b");

    message = <Message>Message.instantiate(source); // from a serialized JSON
    expect(message).not.toBe(null);
    expect(message.user.username).toBe("c");
    expect(message.body).toBe("d");

    source.user.username = "e";
    source.body = "f";
    message = <Message>Message.instantiate(source.objectify()); // from a key-value object
    expect(message).not.toBe(null);
    expect(message.user.username).toBe("e");
    expect(message.body).toBe("f");
  });
  test("object", () => {
    const source = new Message(new User("72345678901234", "x"), "y");
    expect(source).toBeTypeOf("object");
    expect(source).toBeInstanceOf(Message);

    const obj = source.objectify();
    expect(obj).toBeTypeOf("object");
    expect(obj).not.toBeInstanceOf(Message);
    expect(obj.user.username).toBe("x");
    expect(obj["body"]).toBe("y");
  });
  test("json", () => {
    const source = new Message(
      new User("12345678901234", "Alice"),
      "Hello, world!"
    );
    expect(source).toBeTypeOf("object");
    expect(source).toBeInstanceOf(Message);

    const json_string = source.stringify();
    expect(json_string).toContain("Alice");
    expect(json_string).toContain("Hello, world!");

    const obj = JSON.parse(json_string);
    expect(obj.user.username).toBe("Alice");
    expect(obj.body).toBe("Hello, world!");

    const final: Message = <Message>Message.from(obj);
    expect(final).not.toBe(null);
    expect(final.user.username).toBe("Alice");
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
    chat.add("Alice", "12345678901234", "Hello, world!");
    expect(chat.messages).toHaveLength(1);
    expect(chat.messages[0].user.username).toBe("Alice");
    expect(chat.messages[0].body).toBe("Hello, world!");
  });
  test("object", () => {
    const chat = new Chat();
    chat.add("Alice", "12345678901234", "Hello, world!");

    let obj = chat.objectify();
    expect(obj).toBeInstanceOf(Object);
    expect(obj.messages).toBeInstanceOf(Array);
    expect(obj.messages).toHaveLength(1);
    expect(obj.messages[0]).toBeInstanceOf(Object);
    expect(obj.messages[0].user.username).toBe("Alice");
    expect(obj.messages[0].body).toBe("Hello, world!");

    chat.add("Bob", "22345678901234", "Hello, world!");
    expect(obj.messages).toHaveLength(1);
    obj = chat.objectify();
    expect(obj.messages).toHaveLength(2);
    expect(obj.messages[0]).toBeInstanceOf(Object);
    expect(obj.messages[0].user.username).toBe("Alice");
    expect(obj.messages[0].body).toBe("Hello, world!");
    expect(obj.messages[1]).toBeInstanceOf(Object);
    expect(obj.messages[1].user.username).toBe("Bob");
    expect(obj.messages[1].body).toBe("Hello, world!");

    chat.add("foo", "32345678901234", "bar");
    expect(obj.messages).toHaveLength(2);
    obj = chat.objectify();
    expect(obj.messages).toHaveLength(3);
    expect(obj.messages[0]).toBeInstanceOf(Object);
    expect(obj.messages[0].user.username).toBe("Alice");
    expect(obj.messages[0].body).toBe("Hello, world!");
    expect(obj.messages[1]).toBeInstanceOf(Object);
    expect(obj.messages[1].user.username).toBe("Bob");
    expect(obj.messages[1].body).toBe("Hello, world!");
    expect(obj.messages[2]).toBeInstanceOf(Object);
    expect(obj.messages[2].user.username).toBe("foo");
    expect(obj.messages[2].body).toBe("bar");
  });
  test("json", () => {
    const chat = new Chat();
    chat.add("a", "42345678901234", "b");
    chat.add("c", "52345678901234", "d");
    chat.add("e", "62345678901234", "f");
    const obj = JSON.parse(chat.stringify());
    expect(obj.messages).toHaveLength(3);
    expect(obj.messages[0].user.username).toBe("a");
    expect(obj.messages[0].body).toBe("b");
    expect(obj.messages[1].user.username).toBe("c");
    expect(obj.messages[1].body).toBe("d");
    expect(obj.messages[2].user.username).toBe("e");
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
    const obj = lobby.objectify();
    expect(obj).toBeInstanceOf(Object);
    expect(obj.path).toBe(lobby.path);
    expect(obj.chat).toBeInstanceOf(Object);
    expect(obj.games).toHaveLength(lobby.games.length);
    expect(obj.games).toBeInstanceOf(Array);
  });
  test("json", () => {
    const lobby = new Lobby("5678");
    const obj = JSON.parse(lobby.stringify());
    expect(obj).toBeInstanceOf(Object);
    expect(obj.path).toBe(lobby.path);
    expect(obj.chat).toBeInstanceOf(Object);
    expect(obj.games).toHaveLength(lobby.games.length);
    expect(obj.games).toBeInstanceOf(Array);
  });
  test("find_game", () => {
    const lobby = new Lobby("5678");
    expect(lobby).toBeInstanceOf(Object);
    expect(lobby.games).toHaveLength(1);
    expect(lobby.games[0].id).toBe("foo");
    expect(lobby.find_game("foo")).toBe(lobby.games[0]);
    expect(lobby.find_game("bar")).toBe(null);
  });
});
