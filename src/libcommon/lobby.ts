import { RedDots } from "../games/red_dots.ts";
import { Schema } from "./interfaces.ts";
import { copy, instantiate, validate } from "./schema.ts";

class User {
  userid: string;
  username: string;

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
    return instantiate<User>(inp, User);
  }

  static validate(inp: Record<string, any> | string): boolean {
    return validate(inp, User);
  }

  objectify() {
    return { userid: this.userid, username: this.username };
  }
}

class Message {
  user: User;
  body: string;
  timestamp: number;

  static schema: Schema = {
    properties: {
      user: { type: User },
      body: { type: "string" },
      timestamp: { type: "number" },
    },
  };

  constructor(user?: User, body?: string, timestamp?: number) {
    this.user = user ? copy(user, User) : new User();
    this.body = body ?? "";
    this.timestamp = timestamp ?? Date.now();
  }

  static instantiate(inp: Record<string, any> | string): Message | null {
    return instantiate<Message>(inp, Message);
  }

  static validate(inp: Record<string, any> | string): boolean {
    return validate(inp, Message);
  }

  objectify() {
    return {
      user: this.user.objectify(),
      body: this.body,
      timestamp: this.timestamp,
    };
  }
}

class Chat {
  messages: Message[];
  users: User[];

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
        const converted = instantiate<User>(m, User);
        if (converted === null) {
          continue;
        }
        this.users.push(converted);
      }
    }
  }

  static from(inp: Object | Chat | string): Chat | null {
    if (inp instanceof Chat) {
      return new Chat(inp.messages);
    }
    const converted = inp instanceof Object ? inp : JSON.parse(inp);
    if ("messages" in converted && converted.messages instanceof Array) {
      return new Chat(converted.messages);
    }
    console.log("Error: Failed to convert object to Chat:");
    console.log(inp);
    return null;
  }

  objectify(): Object {
    let messages = [];
    for (let message of this.messages) {
      messages.push(message.objectify());
    }
    return {
      messages: this.messages.map((m) => m.objectify()),
    };
  }

  stringify(): string {
    return JSON.stringify(this.objectify());
  }
}

class Lobby {
  path: string;
  chat: Chat;
  games: any[];
  constructor(path: string) {
    this.path = path;
    this.chat = new Chat();
    this.games = [];
    this.games.push(new RedDots("foo"));
  }

  objectify(): Object {
    return {
      path: this.path,
      chat: this.chat.objectify(),
      games: this.games.map((g) => g.objectify()),
    };
  }

  stringify(): string {
    return JSON.stringify(this.objectify());
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
