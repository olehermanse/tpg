import { User, Message, Chat, Lobby } from "../src/libcommon/lobby";
import { expect, test, describe } from "vitest";
import * as sv from "../src/libcommon/schema.ts";

describe("User", () => {
  test("constructor", () => {
    const user = new User("12345678901234", "Alice");
    expect(user).toBeInstanceOf(User);
    expect(user.username).toBe("Alice");
    expect(user.userid).toBe("12345678901234");
  });
  test("instantiate", () => {
    // Instantiate a User from an Object:
    const user = User.instantiate({
      userid: "12345678901234",
      username: "Alice",
    });
    expect(user).not.toBe(null);
    expect(user).toBeInstanceOf(User);
    expect(user?.username).toBe("Alice");
    expect(user?.userid).toBe("12345678901234");
  });
  test("schema", () => {
    // Let's test the schema functions:
    const user_object = {
      userid: "12345678901234",
      username: "Alice",
    };

    // Validate:
    expect(User.validate(user_object)).toBe(true);
    expect(User.validate({})).toBe(false);

    // Instantiate based on schema:
    const user_instance = User.instantiate(user_object);
    expect(user_instance).not.toBe(null);
    expect(user_instance?.username).toBe("Alice");

    // Stringify:
    const user_string = user_instance?.stringify();
    expect(user_string).not.toBe(null);
    expect(user_string).toBeTypeOf("string");
    expect(user_string).toContain('"username"');
    expect(user_string).toContain('"userid"');
    expect(user_string).toContain('"12345678901234"');
    expect(user_string).toContain('"Alice"');

    // Parse:
    const user_parsed = User.instantiate(<String>user_string);
    expect(user_parsed).not.toBe(null);
    expect(user_parsed).toBeInstanceOf(User);
    expect(user_parsed?.username).toBe("Alice");

    // Copy:
    const user_copy: User = sv.copy<User>(<User>user_parsed, User);
    expect(user_copy).not.toBe(null);
    expect(user_copy).toBeInstanceOf(User);
    expect(user_copy.username).toBe("Alice");

    // Objectify:
    const user: any = user_copy.objectify();
    expect(user).not.toBe(null);
    expect(user).toBeInstanceOf(Object);
    expect(user.username).toBe("Alice");
    expect(user.userid).toBe("12345678901234");
  });
});

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
  test("instantiate", () => {
    const original = new Message(new User("82345678901234", "a"), "b");
    let message = Message.instantiate(original);

    // Check that all values were copied:
    expect(message).not.toBe(null);
    expect(message?.user.username).toBe("a");
    expect(message?.user.userid).toBe("82345678901234");
    expect(message?.body).toBe("b");

    // Edit the original objects:
    original.user.username = "c";
    original.body = "d";

    // Original was updated:
    expect(original.user.username).toBe("c");
    expect(original.body).toBe("d");

    // Copy was not:
    expect(message?.user.username).toBe("a");
    expect(message?.body).toBe("b");

    // Call instantiate again, which will copy the values:
    message = Message.instantiate(original);
    expect(message).not.toBe(null);
    expect(message?.user.username).toBe("c");
    expect(message?.user.userid).toBe("82345678901234");
    expect(message?.body).toBe("d");
  });
  test("schema", () => {
    // Let's test the schema functions:
    const input_string =
      '{"user":{"userid":"38133501152442","username":"Cheetah"},"body":"asd","timestamp":1709400461241}';

    // Validate:
    expect(Message.validate(input_string)).toBe(true);
    expect(Message.validate({})).toBe(false);

    // Instantiate based on schema:
    const message_instance = Message.instantiate(input_string);
    expect(message_instance).not.toBe(null);
    expect(message_instance?.user?.username).toBe("Cheetah");
    expect(message_instance?.user?.userid).toBe("38133501152442");
    expect(message_instance?.body).toBe("asd");
    expect(message_instance?.timestamp).toBe(1709400461241);

    // Stringify:
    const message_string = message_instance?.stringify();
    expect(message_string).not.toBe(null);
    expect(message_string).toBeTypeOf("string");
    expect(message_string).toStrictEqual(input_string);
    expect(message_string).toContain('"username"');
    expect(message_string).toContain('"Cheetah"');
    expect(message_string).toContain('"userid"');
    expect(message_string).toContain('"38133501152442"');
    expect(message_string).toContain('"body"');
    expect(message_string).toContain('"asd"');
    expect(message_string).toContain('"timestamp"');
    expect(message_string).toContain("1709400461241");

    // Parse:
    const message_parsed = <Message>Message.instantiate(<String>message_string);
    expect(message_parsed).not.toBe(null);
    expect(message_parsed).toBeInstanceOf(Message);
    expect(message_parsed?.user.username).toBe("Cheetah");
    expect(Message.validate(message_parsed)).toBe(true);

    // Copy:
    const message_copy = sv.copy<Message>(<Message>message_parsed, Message);
    expect(message_copy).not.toBe(null);
    expect(message_copy).toBeInstanceOf(Message);
    expect(message_copy.user.username).toBe("Cheetah");
    expect(Message.validate(message_copy)).toBe(true);

    // Objectify:
    const message_object: any = message_copy.objectify();
    expect(message_object).not.toBe(null);
    expect(message_object).toBeInstanceOf(Object);
    expect(message_object?.user?.username).toBe("Cheetah");
    expect(message_object?.user?.userid).toBe("38133501152442");
    expect(message_object?.body).toBe("asd");
    expect(message_object?.timestamp).toBe(1709400461241);
    expect(Message.validate(message_object)).toBe(true);
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
  test("schema", () => {
    // Let's test the schema functions:
    const input_string =
      '{"messages":[' +
      '{"user":{"userid":"38133501152442","username":"Cheetah"},"body":"abc","timestamp":1709407691080},' +
      '{"user":{"userid":"38133501152442","username":"Cheetah"},"body":"123","timestamp":1709407691952}],' +
      '"users":[' +
      '{"userid":"38133501152442","username":"Cheetah"}]}';
    const cls = Chat;

    // Validate:
    expect(cls.validate(input_string)).toBe(true);
    expect(cls.validate({})).toBe(false);

    // Instantiate based on schema:
    const data_instance = cls.instantiate(input_string);
    expect(data_instance).not.toBe(null);
    expect(data_instance).toBeInstanceOf(cls);

    // Stringify:
    const data_string = data_instance?.stringify();
    expect(data_string).not.toBe(null);
    expect(data_string).toBeTypeOf("string");
    expect(data_string).toStrictEqual(input_string);
    expect(data_string).toContain('"Cheetah"');

    // Parse:
    const data_parsed = cls.instantiate(<String>data_string);
    expect(data_parsed).not.toBe(null);
    expect(data_parsed).toBeInstanceOf(cls);
    // @ts-ignore
    expect(cls.validate(data_parsed)).toBe(true);

    // Copy:
    const data_copy = sv.copy(data_parsed, cls);
    expect(data_copy).not.toBe(null);
    expect(data_copy).toBeInstanceOf(cls);
    // @ts-ignore
    expect(cls.validate(data_copy)).toBe(true);

    // Objectify:
    const data_object: any = data_copy?.objectify();
    expect(data_object).not.toBe(null);
    expect(data_object).toBeInstanceOf(Object);
    expect(cls.validate(data_object)).toBe(true);

    // Finally, convert back to instance and check data:
    const data_final = cls.instantiate(input_string);
    expect(data_final).not.toBe(null);
    expect(data_final).toBeInstanceOf(cls);
    expect(data_final?.messages[0].body).toBe("abc");
    expect(data_final?.messages[1].body).toBe("123");
    expect(data_final?.messages[0].user.username).toBe("Cheetah");
    expect(data_final?.users[0].username).toBe("Cheetah");
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
  test("find_game", () => {
    const lobby = new Lobby("5678");
    expect(lobby).toBeInstanceOf(Object);
    expect(lobby.games).toHaveLength(1);
    expect(lobby.games[0].id).toBe("foo");
    expect(lobby.find_game("foo")).toBe(lobby.games[0]);
    expect(lobby.find_game("bar")).toBe(null);
  });
});
