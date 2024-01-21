import { RedDots } from "../games/red_dots.ts";

class Lobby {
  path: string;
  games: any[];
  chat_log: string[];
  constructor(path) {
    this.path = path;
    this.games = [];
    this.games.push(new RedDots("foo"));
    this.chat_log = [];
  }

  get object() {
    let games = [];
    for (let game of this.games) {
      games.push(game.object);
    }
    return {
      chat: this.chat_log,
      games: games,
    };
  }

  get json() {
    return JSON.stringify(this.object);
  }

  add_chat_message(message: string) {
    this.chat_log.push(message);
  }

  get_chat_json() {
    return JSON.stringify(this.chat_log);
  }
}

export { Lobby };
