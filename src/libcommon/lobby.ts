import { RedDots } from "../games/red_dots.ts";
import { Schema } from "./interfaces.ts";
import * as sv from "./schema.ts";

class User {
  userid: string;
  username: string;

  static class_name: string = "User";
  static schema: Schema = {
    properties: {
      userid: { type: "string" },
      username: { type: "string" },
    },
  };

  constructor(userid?: string, username?: string) {
    this.userid = userid ?? "";
    this.username = username ?? "";
  }

  static instantiate(inp: Record<string, any> | string): User | null {
    return sv.instantiate<User>(inp, User);
  }

  static validate(inp: Record<string, any> | string): boolean {
    return sv.validate(inp, User);
  }

  objectify(): Object {
    return sv.objectify(this);
  }

  stringify(): string {
    return sv.stringify(this);
  }
}

class Message {
  user: User;
  body: string;
  timestamp: number;

  static class_name: string = "Message";
  static schema: Schema = {
    properties: {
      user: { type: User },
      body: { type: "string" },
      timestamp: { type: "number" },
    },
  };

  constructor(user?: User, body?: string, timestamp?: number) {
    this.user = user ? sv.copy(user, User) : new User();
    this.body = body ?? "";
    this.timestamp = timestamp ?? Date.now();
  }

  static instantiate(inp: Record<string, any> | string): Message | null {
    return sv.instantiate<Message>(inp, Message);
  }

  static validate(inp: Record<string, any> | string): boolean {
    return sv.validate(inp, Message);
  }

  objectify(): Object {
    return sv.objectify(this);
  }

  stringify(): string {
    return sv.stringify(this);
  }
}

class Chat {
  messages: Message[];
  users: User[];

  static class_name: string = "Chat";
  static schema: Schema = {
    properties: {
      messages: { type: Message, array: true },
      users: { type: User, array: true },
    },
  };

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
        const converted = Message.instantiate(m);
        if (converted === null) {
          continue;
        }
        this.messages.push(converted);
      }
    }
    this.users = [];
    if (users != null) {
      for (let m of users) {
        const converted = User.instantiate(m);
        if (converted === null) {
          continue;
        }
        this.users.push(converted);
      }
    }
  }

  static instantiate(inp: Record<string, any> | string): Chat | null {
    return sv.instantiate<Chat>(inp, Chat);
  }

  static validate(inp: Record<string, any> | string): boolean {
    return sv.validate(inp, Chat);
  }

  objectify(): Object {
    return sv.objectify(this);
  }

  stringify(): string {
    return sv.stringify(this);
  }
}

class Lobby {
  path: string;
  chat: Chat;
  games: any[];

  static class_name: string = "Lobby";
  static schema: Schema = {
    properties: {
      path: { type: String },
      chat: { type: Chat },
      games: { type: undefined },
    },
  };

  constructor(path: string) {
    this.path = path;
    this.chat = new Chat();
    this.games = [];
    this.games.push(new RedDots("foo"));
  }

  static instantiate(inp: Record<string, any> | string): Chat | null {
    return sv.instantiate<Chat>(inp, Chat);
  }

  static validate(inp: Record<string, any> | string): boolean {
    return sv.validate(inp, Chat);
  }

  objectify(): Object {
    return sv.objectify(this);
  }

  stringify(): string {
    return sv.stringify(this);
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

export { Lobby, Chat, Message, User };
