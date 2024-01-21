import { RedDots } from "../games/red_dots.ts";

class Message {
  username: string;
  body: string;

  constructor(username, body) {
    this.username = username;
    this.body = body;
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

  add(username, message) {
    this.messages.push(new Message(username, message));
  }

  constructor() {
    this.messages = [];
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
  games: any[];
  chat: Chat;
  constructor(path) {
    this.path = path;
    this.games = [];
    this.games.push(new RedDots("foo"));
    this.chat = new Chat();
  }

  get object() {
    return {
      chat: this.chat.object,
      games: this.games.map((g) => g.object),
    };
  }

  get json() {
    return JSON.stringify(this.object);
  }

  add_chat_message(message: string) {
    this.chat.messages.push(message);
  }
}

export { Lobby, Chat, Message };
