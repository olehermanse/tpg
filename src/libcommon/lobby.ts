import { RedDots } from "../games/red_dots.ts";
import { Schema, SchemaClass } from "./schema.ts";
import * as sv from "./schema.ts";

class User implements SchemaClass {
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

class Message implements SchemaClass {
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

class Chat implements SchemaClass {
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
        if (converted === null) {
          continue;
        }
        this.messages.push(converted);
      }
    }
    this.users = [];
    if (users != null) {
      for (let m of users) {
        const converted = sv.convert<User>(m, new User());
        if (converted === null) {
          continue;
        }
        this.users.push(converted);
      }
    }
  }
}

class Lobby implements SchemaClass {
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

export { Lobby, Chat, Message, User };
