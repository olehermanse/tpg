import {
  User,
  Message,
  Chat,
  Lobby,
  runtime_tests,
} from "../src/libcommon/lobby";
import { expect, test, describe } from "vitest";
import * as sv from "../src/libcommon/schema.ts";

describe("User", () => {
  test("constructor", () => {
    const user = new User("12345678901234", "Alice");
    expect(user).toBeInstanceOf(User);
    expect(user.username).toBe("Alice");
    expect(user.userid).toBe("12345678901234");
  });
  test("to_class", () => {
    // Instantiate a User from an Object:
    const user = sv.to_class(
      {
        userid: "12345678901234",
        username: "Alice",
      },
      new User()
    );
    expect(user).not.toBeInstanceOf(Error);
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
    expect(sv.is_valid(user_object, new User())).toBe(true);
    expect(sv.is_valid({}, new User())).toBe(false);

    // Instantiate based on schema:
    const user_instance = <User>sv.to_class(user_object, new User());
    expect(user_instance).not.toBeInstanceOf(Error);
    expect(user_instance?.username).toBe("Alice");

    // Stringify:
    const user_string = sv.to_string(user_instance);
    expect(user_string).not.toBeInstanceOf(Error);
    expect(user_string).toBeTypeOf("string");
    expect(user_string).toContain('"username"');
    expect(user_string).toContain('"userid"');
    expect(user_string).toContain('"12345678901234"');
    expect(user_string).toContain('"Alice"');

    // Parse:
    const user_parsed = <User>sv.to_class(user_string, new User());
    expect(user_parsed).not.toBeInstanceOf(Error);
    expect(user_parsed).toBeInstanceOf(User);
    expect(user_parsed?.username).toBe("Alice");

    // Copy:
    const user_copy: User = sv.copy(user_parsed, new User());
    expect(user_copy).not.toBeInstanceOf(Error);
    expect(user_copy).toBeInstanceOf(User);
    expect(user_copy.username).toBe("Alice");

    // Objectify:
    const user: any = sv.to_object(user_copy);
    expect(user).not.toBeInstanceOf(Error);
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
  test("is_valid", () => {
    const original = new Message(new User("82345678901234", "a"), "b");
    const string_message = sv.to_string(original);
    expect(sv.is_valid(string_message, new Message())).toBe(true);
  });
  test("to_class", () => {
    const original = new Message(new User("82345678901234", "a"), "b");
    let message = <Message>sv.to_class(sv.to_string(original), new Message());

    // Check that all values were copied:
    expect(message).not.toBeInstanceOf(Error);
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

    // Call to_class again, which will copy the values:
    message = <Message>sv.to_class(original, new Message());
    expect(message).not.toBeInstanceOf(Error);
    expect(message?.user.username).toBe("c");
    expect(message?.user.userid).toBe("82345678901234");
    expect(message?.body).toBe("d");
  });
  test("schema", () => {
    // Let's test the schema functions:
    const input_string =
      '{"user":{"userid":"38133501152442","username":"Cheetah"},"body":"asd","timestamp":1709400461241}';

    // Validate:
    expect(sv.is_valid(input_string, new Message())).toBe(true);
    expect(sv.is_valid({}, new Message())).toBe(false);

    // Instantiate based on schema:
    const message_instance = <Message>sv.to_class(input_string, new Message());
    expect(message_instance).not.toBeInstanceOf(Error);
    expect(message_instance?.user?.username).toBe("Cheetah");
    expect(message_instance?.user?.userid).toBe("38133501152442");
    expect(message_instance?.body).toBe("asd");
    expect(message_instance?.timestamp).toBe(1709400461241);

    // Stringify:
    const message_string = sv.to_string(message_instance);
    expect(message_string).not.toBeInstanceOf(Error);
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
    const message_parsed = <Message>(
      sv.to_class<Message>(message_string, new Message())
    );
    expect(message_parsed).not.toBeInstanceOf(Error);
    expect(message_parsed).toBeInstanceOf(Message);
    expect(message_parsed?.user.username).toBe("Cheetah");
    expect(sv.is_valid(message_parsed, new Message())).toBe(true);

    // Copy:
    const message_copy = sv.copy(message_parsed, new Message());
    expect(message_copy).not.toBeInstanceOf(Error);
    expect(message_copy).toBeInstanceOf(Message);
    expect(message_copy.user.username).toBe("Cheetah");
    expect(sv.is_valid(message_copy, new Message())).toBe(true);

    // Objectify:
    const message_object: any = sv.to_object(message_copy);
    expect(message_object).not.toBeInstanceOf(Error);
    expect(message_object).toBeInstanceOf(Object);
    expect(message_object?.user?.username).toBe("Cheetah");
    expect(message_object?.user?.userid).toBe("38133501152442");
    expect(message_object?.body).toBe("asd");
    expect(message_object?.timestamp).toBe(1709400461241);
    expect(sv.is_valid(message_object, new Message())).toBe(true);
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
  test("is_valid", () => {
    // Let's test the schema functions:
    const input_string =
      '{"messages":[' +
      '{"user":{"userid":"38133501152442","username":"Cheetah"},"body":"abc","timestamp":1709407691080},' +
      '{"user":{"userid":"38133501152442","username":"Cheetah"},"body":"123","timestamp":1709407691952}],' +
      '"users":[' +
      '{"userid":"38133501152442","username":"Cheetah"}]}';

    // Validate:
    expect(sv.is_valid(input_string, new Chat())).toBe(true);
  });
  test("schema", () => {
    // Let's test the schema functions:
    const input_string =
      '{"messages":[' +
      '{"user":{"userid":"38133501152442","username":"Cheetah"},"body":"abc","timestamp":1709407691080},' +
      '{"user":{"userid":"38133501152442","username":"Cheetah"},"body":"123","timestamp":1709407691952}],' +
      '"users":[' +
      '{"userid":"38133501152442","username":"Cheetah"}]}';

    // Validate:
    expect(sv.is_valid(input_string, new Chat())).toBe(true);
    expect(sv.is_valid({}, new Chat())).toBe(false);

    // Instantiate based on schema:
    const data_instance = <Chat>sv.to_class(input_string, new Chat());
    expect(data_instance).not.toBeInstanceOf(Error);
    expect(data_instance).toBeInstanceOf(Chat);

    // Stringify:
    const data_string = sv.to_string(data_instance);
    expect(data_string).not.toBeInstanceOf(Error);
    expect(data_string).toBeTypeOf("string");
    expect(data_string).toStrictEqual(input_string);
    expect(data_string).toContain('"Cheetah"');

    // Parse:
    const data_parsed = <Chat>sv.to_class(<String>data_string, new Chat());
    expect(data_parsed).not.toBeInstanceOf(Error);
    expect(data_parsed).toBeInstanceOf(Chat);
    // @ts-ignore
    expect(sv.is_valid(data_parsed, new Chat())).toBe(true);

    // Copy:
    const data_copy = sv.copy(data_parsed, new Chat());
    expect(data_copy).not.toBeInstanceOf(Error);
    expect(data_copy).toBeInstanceOf(Chat);
    // @ts-ignore
    expect(sv.is_valid(data_copy, new Chat())).toBe(true);

    // Objectify:
    const data_object: any = sv.to_object(data_copy);
    expect(data_object).not.toBeInstanceOf(Error);
    expect(data_object).toBeInstanceOf(Object);
    expect(sv.is_valid(data_object, new Chat())).toBe(true);

    // Finally, to_class back to instance and check data:
    const data_final = <Chat>sv.to_class(input_string, new Chat());
    expect(data_final).not.toBeInstanceOf(Error);
    expect(data_final).toBeInstanceOf(Chat);
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

describe("runtime_tests", () => {
  test("runs without error", () => {
    expect(runtime_tests()).toBe(true);
  });
});
