import { User } from "./user.ts";
import { Schema, SchemaClass } from "@olehermanse/utils/schema.js";
import * as sv from "@olehermanse/utils/schema.js";
import { Fives } from "../games/fives.ts";
import { game_selector } from "../games/game_selector.ts";

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
    this.user = user ? sv.copy(user, new User()) : new User();
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

  lookup_user(userid: string): User | null {
    for (const user of this.users) {
      if (user.userid === userid) {
        return user;
      }
    }
    return null;
  }

  add(message: Message) {
    let user = this.lookup_user(message.user.userid);
    if (user === null) {
      user = sv.copy(message.user, new User());
      this.users.push(user);
    } else if (user.userid != message.user.userid) {
      user.username = message.user.username;
    }
    this.messages.push(message);
  }

  get_username(userid: string): string | null {
    return this.lookup_user(userid)?.username ?? null;
  }

  constructor(
    messages: null | Message[] | object[] = null,
    users: null | User[] | object[] = null
  ) {
    this.messages = [];
    if (messages != null) {
      for (const m of messages) {
        const to_classed = sv.to_class<Message>(m, new Message());
        if (to_classed instanceof Error) {
          console.log(to_classed);
          continue;
        }
        this.messages.push(to_classed);
      }
    }
    this.users = [];
    if (users != null) {
      for (const m of users) {
        const to_classed = sv.to_class<User>(m, new User());
        if (to_classed instanceof Error) {
          console.log(to_classed);
          continue;
        }
        this.users.push(to_classed);
      }
    }
  }
}

export class Lobby implements SchemaClass {
  id: string;
  chat: Chat;
  games: any[];

  class_name(): string {
    return "Lobby";
  }
  schema(): Schema {
    return {
      properties: {
        id: { type: "string" },
        chat: { type: Chat },
        games: { type: game_selector, array: true },
      },
    };
  }

  constructor(path?: string) {
    this.id = path ?? "";
    this.chat = new Chat();
    this.games = [];
    this.games.push(new Fives());
  }

  find_game(game_id: string): any | null {
    for (const x of this.games) {
      if (x.id === game_id) {
        return x;
      }
    }
    return null;
  }

  refresh_users() {
    for (const game of this.games) {
      game.players = this.chat.users;
    }
  }

  login(user: User) {
    for (const u of this.chat.users) {
      if (u.userid !== user.userid) {
        continue;
      }
      if (u.username !== user.username) {
        u.username = user.username;
        this.refresh_users();
      }
      return;
    }
    this.chat.users.push(user);
    this.refresh_users();
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
  console.log('new User("12345678901234", "Alice") -> ' + sv.to_string(a));
  success &&= sv.assertion(
    sv.to_string(a) === '{"userid":"12345678901234","username":"Alice"}',
    "to_string should have predictable output"
  );
  if (success != true) {
    return false;
  }

  const b = '{"username": "Alice"}';
  console.log(`is_valid('${b}', new User()) -> ` + sv.is_valid(b, new User()));
  success &&= sv.assertion(
    sv.is_valid(b, new User()) === false,
    "is_valid should stop missing fields"
  );
  if (success != true) {
    return false;
  }

  const c = '{"userid": "12345678901234", "username": "Alice"}';
  console.log(`is_valid('${c}', new User()) -> ` + sv.is_valid(c, new User()));
  success &&= sv.assertion(
    sv.is_valid(c, new User()) === true,
    "is_valid should accept a well-formed User"
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
  console.log("new Message() -> " + sv.to_string(d));
  success &&= sv.assertion(
    sv.to_string(d) ===
      '{"user":{"userid":"","username":""},"body":"","timestamp":1709436801425}',
    "to_string should have predictable output for Message"
  );
  if (success != true) {
    return false;
  }
  console.log(
    `is_valid('${sv.to_string(d)}', new Message()) -> ` +
      sv.is_valid(sv.to_string(d), new Message())
  );
  success &&= sv.assertion(
    sv.is_valid(d, new Message()) === true,
    "is_valid should accept a well-formed Message"
  );
  if (success != true) {
    return false;
  }

  const e = new Chat();
  console.log("new Chat() -> " + sv.to_string(e));
  success &&= sv.assertion(
    sv.to_string(e) === '{"messages":[],"users":[]}',
    "to_string should have predictable output for Chat"
  );
  if (success != true) {
    return false;
  }
  console.log(
    `is_valid('${sv.to_string(e)}', new Chat()) -> ` +
      sv.is_valid(sv.to_string(e), new Chat())
  );
  success &&= sv.assertion(
    sv.is_valid(e, new Chat()) === true,
    "is_valid should accept a well-formed Chat"
  );
  return success;
}
