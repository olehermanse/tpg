import { BaseGame } from "../libcommon/game.ts";
import { Schema } from "../libcommon/schema.ts";

export class TicTacToe extends BaseGame {
  board: string[];

  constructor() {
    super();
    this.board = new Array(9).fill(" ");
  }

  receive(game: BaseGame) {
    console.assert(game.name === this.name);
    console.assert(game instanceof TicTacToe);
    if (!(game instanceof TicTacToe)) {
      return;
    }
    const source: TicTacToe = game;
    if (source.board != this.board) {
      this.board = source.board;
    }
  }

  class_name(): string {
    return "TicTacToe";
  }

  schema(): Schema {
    const schema = super.base_schema();
    schema["properties"]["board"] = { type: "string", array: true };
    return schema;
  }

  mouse_click(_x: number, _y: number) {
    return;
  }

  draw(_ctx: any) {
    return;
  }
}
