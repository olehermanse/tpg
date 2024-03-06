import {
  standard_canvas_height,
  standard_canvas_width,
} from "../libcommon/utils.ts";
import { FrontendGame } from "../libcommon/game.ts";
import { User } from "../libcommon/user.ts";
import { Schema } from "../libcommon/schema.ts";

export class TicTacToe implements FrontendGame {
  id: string = "";
  name: string = "TicTacToe";
  players: User[] = [];
  width = standard_canvas_width();
  height = standard_canvas_height();
  board: string[] = new Array(9).fill(" ");

  constructor(id?: string) {
    this.id = id ?? "";
  }

  schema(): Schema {
    return {
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        width: { type: "number" },
        height: { type: "number" },
        board: { type: "string", array: true },
      },
    };
  }

  mouse_click(_x: number, _y: number) {
    return;
  }

  draw(_ctx: any) {
    return;
  }
}
