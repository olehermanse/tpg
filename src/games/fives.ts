import { BaseGame } from "../libcommon/game.ts";
import { Schema } from "../libcommon/schema.ts";
import { limit, xy } from "../libcommon/utils.ts";
import { Draw } from "../libdraw/draw.ts";

type FivesSymbol = " " | "X" | "O";

class Rect {
  symbol: FivesSymbol = " ";
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

export class Fives extends BaseGame {
  board: FivesSymbol[];
  rects: Rect[];
  n: number;

  constructor() {
    super();
    this.n = 5;
    this.board = new Array(this.n * this.n).fill(" ");
    this.rects = [];
    const size = (this.height * 2) / 3;
    const half = size / 2;
    const w = size / this.n;
    const h = w;
    const center = xy(this.width / 2, this.height / 2);
    const top_left = xy(center.x - half, center.y - half);

    for (let r = 0; r < this.n; r++) {
      for (let c = 0; c < this.n; c++) {
        const x = top_left.x + c * w;
        const y = top_left.y + r * h;
        const rect = new Rect(x, y, w, h);
        this.rects.push(rect);
      }
    }
  }

  get length(): number {
    return this.n * this.n;
  }

  class_name(): string {
    return "Fives";
  }

  schema(): Schema {
    const schema = super.base_schema();
    schema["properties"]["board"] = { type: "string", array: true };
    return schema;
  }

  set_square_i(i: number, symbol: FivesSymbol) {
    const r = limit(0, Math.floor(i / this.n), this.n - 1);
    const c = limit(0, Math.floor(i % this.n), this.n - 1);
    this.set_square(r, c, symbol);
  }

  set_square(row: number, column: number, symbol: FivesSymbol) {
    const i = row * this.n + column;
    this.board[i] = symbol;
    this.rects[i].symbol = symbol;
  }

  refresh_rects() {
    const len = this.length;
    for (let i = 0; i < len; i++) {
      this.rects[i].symbol = this.board[i];
    }
  }

  receive(game: BaseGame) {
    console.assert(game.name === this.name);
    console.assert(game instanceof Fives);
    if (!(game instanceof Fives)) {
      return;
    }
    const source: Fives = game;
    if (source.board != this.board) {
      this.board = source.board;
      this.refresh_rects();
    }
  }

  next(): FivesSymbol {
    const circles = this.board.filter((a) => a === "O").length;
    const crosses = this.board.filter((a) => a === "X").length;
    if (crosses < circles) {
      return "X";
    }
    return "O";
  }

  mouse_click(x: number, y: number) {
    const len = this.length;
    for (let i = 0; i < len; i++) {
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
