import { BaseGame } from "../libcommon/game.ts";
import { Schema } from "../libcommon/schema.ts";
import { limit, xy } from "../libcommon/utils.ts";
import { Draw } from "../libdraw/draw.ts";

type FivesSymbol = " " | "X" | "O";

class Rect {
  symbol: FivesSymbol = " ";
  highlight = false;
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
  to_win: number;
  combinations: number[][];
  game_over: boolean;

  class_name(): string {
    return "Fives";
  }

  schema(): Schema {
    const schema = super.base_schema();
    schema["properties"]["board"] = { type: "string", array: true };
    schema["properties"]["n"] = { type: "number" };
    schema["properties"]["to_win"] = { type: "number" };
    return schema;
  }

  constructor(n = 5, t = 4) {
    super();
    this.n = n;
    this.to_win = t;
    this.board = new Array(this.n * this.n).fill(" ");

    this.game_over = false;
    this.combinations = [];
    this.rects = [];
    this.generate_rects();
  }

  generate_rects() {
    const size = (this.height * 2) / 3;
    const half = size / 2;
    const w = size / this.n;
    const h = w;
    const center = xy(this.width / 2, this.height / 2);
    const top_left = xy(center.x - half, center.y - half);
    this.rects = [];
    for (let r = 0; r < this.n; r++) {
      for (let c = 0; c < this.n; c++) {
        const x = top_left.x + c * w;
        const y = top_left.y + r * h;
        const rect = new Rect(x, y, w, h);
        this.rects.push(rect);
      }
    }
    this.generate_combinations();
  }

  generate_combinations() {
    const n = this.n;
    this.combinations = [];
    // Add rows:
    for (let r = 0; r < n; r++) {
      const current = [];
      for (let c = 0; c < n; c++) {
        const i = r * n + c;
        current.push(i);
      }
      this.combinations.push(current);
    }
    // Add columns:
    for (let c = 0; c < n; c++) {
      const current = [];
      for (let r = 0; r < n; r++) {
        const i = r * n + c;
        current.push(i);
      }
      this.combinations.push(current);
    }
    // Add diagonals:
    for (let x = 0; x < n; x++) {
      // Down and right, part 1:
      let current = [];
      let r = 0; // Top left corner
      let c = x; // Moving right
      while (r >= 0 && c >= 0 && r < n && c < n) {
        const i = r * n + c;
        current.push(i);
        r += 1;
        c += 1;
      }
      if (current.length >= this.to_win) {
        this.combinations.push(current);
      }
      // Up and right, part 1:
      current = [];
      r = x; // Moving down
      c = 0; // from top left corner
      while (r >= 0 && c >= 0 && r < n && c < n) {
        const i = r * n + c;
        current.push(i);
        r -= 1;
        c += 1;
      }
      if (current.length >= this.to_win) {
        this.combinations.push(current);
      }
      if (x === 0) {
        continue;
      }
      // Down and right, part 2:
      current = [];
      r = x;
      c = 0;
      while (r >= 0 && c >= 0 && r < n && c < n) {
        const i = r * n + c;
        current.push(i);
        r += 1;
        c += 1;
      }
      if (current.length >= this.to_win) {
        this.combinations.push(current);
      }
      // Up and right, part 2:
      current = [];
      r = this.n - 1;
      c = x;
      while (r >= 0 && c >= 0 && r < n && c < n) {
        const i = r * n + c;
        current.push(i);
        r -= 1;
        c += 1;
      }
      if (current.length >= this.to_win) {
        this.combinations.push(current);
      }
    }
  }

  mark_win(streak: number[]) {
    this.game_over = true;
    for (const i of streak) {
      this.rects[i].highlight = true;
    }
    return;
  }

  check_for_win() {
    for (const combination of this.combinations) {
      let streak: number[] = [];
      let symbol = " ";
      for (const i of combination) {
        const current = this.board[i];
        if (current === " ") {
          streak = [];
          symbol = " ";
          continue;
        }
        if (current === symbol) {
          streak.push(i);
          if (streak.length === this.to_win) {
            this.mark_win(streak);
            return;
          }
          continue;
        }
        symbol = current;
        streak = [i];
      }
    }
  }

  get length(): number {
    return this.n * this.n;
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
    this.check_for_win();
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
      this.check_for_win();
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
    if (this.game_over) {
      return;
    }
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
      Draw.rectangle(ctx, rect.x, rect.y, rect.w, rect.h, null, "white", 4);
      if (rect.symbol === "X") {
        Draw.line(
          ctx,
          rect.x + 0.2 * rect.w,
          rect.y + 0.2 * rect.h,
          rect.x + 0.8 * rect.w,
          rect.y + 0.8 * rect.h,
          rect.highlight ? "yellow" : "white",
          4
        );
        Draw.line(
          ctx,
          rect.x + 0.8 * rect.w,
          rect.y + 0.2 * rect.h,
          rect.x + 0.2 * rect.w,
          rect.y + 0.8 * rect.h,
          rect.highlight ? "yellow" : "white",
          4
        );
      }
      if (rect.symbol === "O") {
        const radius = rect.w / 2;
        const x = rect.x + radius;
        const y = rect.y + radius;
        Draw.circle(
          ctx,
          x,
          y,
          0.8 * radius,
          null,
          rect.highlight ? "yellow" : "white",
          4
        );
      }
    }
  }
}
