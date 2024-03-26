import { BaseGame } from "../libcommon/game.ts";
import { Schema } from "../libcommon/schema.ts";
import { limit, xy } from "../libcommon/utils.ts";
import { Draw } from "../libdraw/draw.ts";

type TicTacToeSymbol = " " | "X" | "O";
type TicTacToeNumber = 0 | 1 | 2;

class Rect {
  symbol: TicTacToeSymbol = " ";
  x: number;
  y: number;
  w: number;
  h: number;

  constructor(x: number, y: number, w: number, h: number) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  contains(x: number, y: number): boolean {
    return (
      x >= this.x && x <= this.x + this.w && y >= this.y && y <= this.y + this.h
    );
  }
}

export class TicTacToe extends BaseGame {
  board: TicTacToeSymbol[];
  rects: Rect[];

  constructor() {
    super();
    this.board = new Array(9).fill(" ");
    this.rects = [];
    const size = (this.height * 2) / 3;
    const half = size / 2;
    const w = size / 3;
    const h = w;
    const center = xy(this.width / 2, this.height / 2);
    const top_left = xy(center.x - half, center.y - half);

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const x = top_left.x + c * w;
        const y = top_left.y + r * h;
        const rect = new Rect(x, y, w, h);
        this.rects.push(rect);
      }
    }
  }

  set_square_i(i: number, symbol: TicTacToeSymbol) {
    const r = <TicTacToeNumber> limit(0, Math.floor(i / 3), 2);
    const c = <TicTacToeNumber> limit(0, Math.floor(i % 3), 2);
    this.set_square(r, c, symbol);
  }

  set_square(
    row: TicTacToeNumber,
    column: TicTacToeNumber,
    symbol: TicTacToeSymbol,
  ) {
    const i = row * 3 + column;
    this.board[i] = symbol;
    this.rects[i].symbol = symbol;
  }

  refresh_rects() {
    for (let i = 0; i < 9; i++) {
      this.rects[i].symbol = this.board[i];
    }
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
      this.refresh_rects();
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

  next(): TicTacToeSymbol {
    const circles = this.board.filter((a) => a === "O").length;
    const crosses = this.board.filter((a) => a === "X").length;
    if (crosses < circles) {
      return "X";
    }
    return "O";
  }

  mouse_click(x: number, y: number) {
    for (let i = 0; i < 9; i++) {
      const rect = this.rects[i];
      if (!rect.contains(x, y)) {
        continue;
      }
      if (rect.symbol != " ") {
        return;
      }
      this.set_square_i(i, this.next());
      this.schedule_sync();
    }
  }

  draw(ctx: any) {
    for (const rect of this.rects) {
      Draw.rectangle(ctx, rect.x, rect.y, rect.w, rect.h, null, "white");
      if (rect.symbol === "X") {
        Draw.line(
          ctx,
          rect.x + 0.2 * rect.w,
          rect.y + 0.2 * rect.h,
          rect.x + 0.8 * rect.w,
          rect.y + 0.8 * rect.h,
          "white",
          8,
        );
        Draw.line(
          ctx,
          rect.x + 0.8 * rect.w,
          rect.y + 0.2 * rect.h,
          rect.x + 0.2 * rect.w,
          rect.y + 0.8 * rect.h,
          "white",
          8,
        );
      }
      if (rect.symbol === "O") {
        const radius = rect.w / 2;
        const x = rect.x + radius;
        const y = rect.y + radius;
        Draw.circle(ctx, x, y, 0.8 * radius, null, "white");
      }
    }
  }
}
