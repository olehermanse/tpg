import { RedDots } from "../games/red_dots.ts";
import { Schema, SchemaClass } from "./schema.ts";
import * as sv from "./schema.ts";

export class User implements SchemaClass {
  userid: string;
  username: string;

  class_name(): string {
    return "User";
  }
  schema(): Schema {
    return {
      properties: {
        userid: { type: "string" },
        username: { type: "string" },
      },
    };
  }

  constructor(userid?: string, username?: string) {
    this.userid = userid ?? "";
    this.username = username ?? "";
  }
}

export class Message implements SchemaClass {
  user: User;
  body: string;
  timestamp: number;

  class_name(): string {
    return "Message";
  }
  schema(): Schema {
    return {
      properties: {
        user: { type: User },
        body: { type: "string" },
        timestamp: { type: "number" },
      },
    };
  }

  constructor(user?: User, body?: string, timestamp?: number) {
    this.user = user ? sv.copy(user) : new User();
    this.body = body ?? "";
    this.timestamp = timestamp ?? Date.now();
  }
}

export class Chat implements SchemaClass {
  messages: Message[];
  users: User[];

  class_name(): string {
    return "Chat";
  }
  schema(): Schema {
    return {
      properties: {
        messages: { type: Message, array: true },
        users: { type: User, array: true },
      },
    };
  }

  add(username: string, userid: string, message: string) {
    const user = new User(userid, username);
    this.messages.push(new Message(user, message));
  }

  get_username(userid: string): string | null {
    for (let user of this.users) {
      if (user.userid === userid) {
        return user.username;
      }
    }
    return null;
  }

  constructor(
    messages: null | Message[] | Object[] = null,
    users: null | User[] | Object[] = null
  ) {
    this.messages = [];
    if (messages != null) {
      for (let m of messages) {
        const converted = sv.convert<Message>(m, new Message());
        if (converted instanceof Error) {
          console.log(converted);
          continue;
        }
        this.messages.push(converted);
      }
    }
    this.users = [];
    if (users != null) {
      for (let m of users) {
        const converted = sv.convert<User>(m, new User());
        if (converted instanceof Error) {
          console.log(converted);
          continue;
        }
        this.users.push(converted);
      }
    }
  }
}

export class Lobby implements SchemaClass {
  path: string;
  chat: Chat;
  games: any[];

  class_name(): string {
    return "Lobby";
  }
  schema(): Schema {
    return {
      properties: {
        path: { type: String },
        chat: { type: Chat },
        games: { type: undefined },
      },
    };
  }

  constructor(path: string) {
    this.path = path;
    this.chat = new Chat();
    this.games = [];
    this.games.push(new RedDots("foo"));
  }

  find_game(game_id: string): any | null {
    for (let x of this.games) {
      if (x.id === game_id) {
        return x;
      }
    }
    return null;
  }
}

export function runtime_tests(): boolean {
  console.log("Type tests:");
  function wrapper(rep: string, actual: any, expected: string): boolean {
    console.log("sv.type_of(" + rep + ") = " + sv.type_of(actual));
    return sv.assertion(
      sv.type_of(actual) === expected,
      `type_of(${rep}) === ${expected}`
    );
  }

  let success = true;

  success &&= wrapper("3", 3, "number");
  success &&= wrapper("'foo'", "foo", "string");
  success &&= wrapper("true", true, "boolean");
  success &&= wrapper("false", false, "boolean");
  success &&= wrapper("undefined", undefined, "undefined");
  success &&= wrapper("null", null, "null");
  success &&= wrapper("[]", [], "instance Array");
  success &&= wrapper("{}", {}, "instance Object");
  success &&= wrapper("wrapper", wrapper, "function");
  success &&= wrapper("User", User, "class " + User.name);
  success &&= wrapper("Object", Object, "class Object");
  success &&= wrapper("Array", Array, "class Array");
  success &&= wrapper("new User()", new User(), "instance " + User.name);

  if (success != true) {
    return false;
  }

  console.log("Schema tests:");

  const a = new User("12345678901234", "Alice");
  console.log('new User("12345678901234", "Alice") -> ' + sv.stringify(a));
  success &&= sv.assertion(
    sv.stringify(a) === '{"userid":"12345678901234","username":"Alice"}',
    "stringify should have predictable output"
  );
  if (success != true) {
    return false;
  }

  const b = '{"username": "Alice"}';
  console.log(`validate('${b}', new User()) -> ` + sv.validate(b, new User()));
  success &&= sv.assertion(
    sv.validate(b, new User()) === false,
    "validate should stop missing fields"
  );
  if (success != true) {
    return false;
  }

  const c = '{"userid": "12345678901234", "username": "Alice"}';
  console.log(`validate('${c}', new User()) -> ` + sv.validate(c, new User()));
  success &&= sv.assertion(
    sv.validate(c, new User()) === true,
    "validate should accept a well-formed User"
  );
  if (success != true) {
    return false;
  }

  const d = new Message();
  success &&= sv.assertion(
    d.timestamp > 1709436801425,
    "Message timestamp should be after this test was written"
  );
  d.timestamp = 1709436801425;
  console.log("new Message() -> " + sv.stringify(d));
  success &&= sv.assertion(
    sv.stringify(d) ===
      '{"user":{"userid":"","username":""},"body":"","timestamp":1709436801425}',
    "stringify should have predictable output for Message"
  );
  if (success != true) {
    return false;
  }
  console.log(
    `validate('${sv.stringify(d)}', new Message()) -> ` +
      sv.validate(sv.stringify(d), new Message())
  );
  success &&= sv.assertion(
    sv.validate(d, new Message()) === true,
    "validate should accept a well-formed Message"
  );
  if (success != true) {
    return false;
  }

  const e = new Chat();
  console.log("new Chat() -> " + sv.stringify(e));
  success &&= sv.assertion(
    sv.stringify(e) === '{"messages":[],"users":[]}',
    "stringify should have predictable output for Chat"
  );
  if (success != true) {
    return false;
  }
  console.log(
    `validate('${sv.stringify(e)}', new Chat()) -> ` +
      sv.validate(sv.stringify(e), new Chat())
  );
  success &&= sv.assertion(
    sv.validate(e, new Chat()) === true,
    "validate should accept a well-formed Chat"
  );
  return success;
}
