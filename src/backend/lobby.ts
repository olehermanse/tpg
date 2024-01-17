import { RedDots } from "../games/red_dots.ts";

class Lobby {
  path: string;
  games: any[];
  chat_log: string[];
  constructor(path) {
    this.path = path;
    this.games = [];
    this.games.push(new RedDots("foo"));
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
}

export { Lobby };
