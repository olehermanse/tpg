import { RedDots } from "../games/red_dots.ts";
import { Schema } from "./interfaces.ts";
import { copy, instantiate } from "./schema.ts";

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
}

class Message {
  user: User;
  body: string;
  timestamp: number;

  constructor(user: User, body: string, timestamp: number | null = null) {
    this.user = copy(user, User);
    this.body = body;
    this.timestamp = timestamp ?? Date.now();
  }

  static from(msg: Object | Message | string): Message | null {
    if (msg instanceof Message) {
      return new Message(msg.user, msg.body, msg.timestamp);
    }
    let converted = msg instanceof Object ? msg : JSON.parse(msg);
    if (
      "user" in converted &&
      "body" in converted &&
      typeof converted.body === "string" &&
      "timestamp" in converted &&
      typeof converted.timestamp === "number"
    ) {
      const user: User | null = instantiate(converted.user, User);
      if (user === null) {
        console.log("Error: Failed to convert object to Message: ");
        console.log(msg);
        return null;
      }
      const body: string = converted["body"];
      const timestamp: number = converted["timestamp"];
      return new Message(user, body, timestamp);
    }
    console.log("Error: Failed to convert object to Message: ");
    console.log(msg);
    return null;
  }

  objectify(): Object {
    return { user: this.user, body: this.body, timestamp: this.timestamp };
  }

  stringify(): string {
    return JSON.stringify(this.objectify());
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
        const converted = Message.from(m);
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
