import { RedDots } from "../games/red_dots.ts";

class User {
  userid: string;
  username: string;
  constructor(userid: string, username: string) {
    this.userid = userid;
    this.username = username;
  }
  static copy(user: User): User {
    return new User(user.userid, user.username);
  }
  static from(user: Object | User | string): User | null {
    if (user instanceof User) {
      return User.copy(user);
    }
    let converted = user instanceof Object ? user : JSON.parse(user);
    if (
      "userid" in converted &&
      "username" in converted &&
      typeof converted.userid === "string" &&
      typeof converted.username === "string"
    ) {
      const userid: string = converted["userid"];
      const username: string = converted["username"];
      return new User(userid, username);
    }
    console.log("Error: Failed to convert object to User:");
    console.log(user);
    return null;
  }
}

class Message {
  user: User;
  body: string;

  constructor(user: User, body: string) {
    this.user = User.copy(user);
    this.body = body;
  }

  static from(msg: Object | Message | string): Message | null {
    if (msg instanceof Message) {
      return new Message(msg.user, msg.body);
    }
    let converted = msg instanceof Object ? msg : JSON.parse(msg);
    if (
      "user" in converted &&
      "body" in converted &&
      converted.user instanceof Object &&
      typeof converted.body === "string"
    ) {
      const user: User | null = User.from(converted["user"]);
      if (user === null) {
        return null;
      }
      const body: string = converted["body"];
      return new Message(user, body);
    }
    console.log("Error: Failed to convert object to Message: ");
    console.log(msg);
    return null;
  }

  get object(): Object {
    return { user: this.user, body: this.body };
  }

  get json(): string {
    return JSON.stringify(this.object);
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
        const converted = User.from(m);
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

  get object(): Object {
    let messages = [];
    for (let message of this.messages) {
      messages.push(message.object);
    }
    return {
      messages: this.messages.map((m) => m.object),
    };
  }

  get json(): string {
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

  get object(): Object {
    return {
      path: this.path,
      chat: this.chat.object,
      games: this.games.map((g) => g.object),
    };
  }

  get json(): string {
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

export { Lobby, Chat, Message, User };
