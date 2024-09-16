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
    users: null | User[] | object[] = null,
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
    console.assert(this.id === "" || this.id[0] === "/");
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
