import { RedDots } from "../games/red_dots.ts";

class Message {
  username: string;
  body: string;

  constructor(username: string, body: string) {
    this.username = username;
    this.body = body;
  }

  static from(msg: Object | Message | string): Message {
    if (msg instanceof Message) {
      return new Message(msg.username, msg.body);
    }
    if (msg instanceof Object) {
      return new Message(msg["username"], msg["body"]);
    }
    const obj = JSON.parse(msg);
    return new Message(obj["username"], obj["body"]);
  }

  get object() {
    return { username: this.username, body: this.body };
  }

  get json() {
    return JSON.stringify(this.object);
  }
}

class Chat {
  messages: Message[];

  constructor() {
    this.messages = [];
  }

  add(username: string, message: string) {
    this.messages.push(new Message(username, message));
  }

  get object() {
    let messages = [];
    for (let message of this.messages) {
      messages.push(message.object);
    }
    return {
      messages: this.messages.map((m) => m.object),
    };
  }

  get json() {
    return JSON.stringify(this.object);
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

  get object() {
    return {
      path: this.path,
      chat: this.chat.object,
      games: this.games.map((g) => g.object),
    };
  }

  get json() {
    return JSON.stringify(this.object);
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

export { Lobby, Chat, Message };
