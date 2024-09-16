import { BaseGame } from "../libcommon/game.ts";
import * as sv from "@olehermanse/utils/schema.js";
import { limit, xy } from "@olehermanse/utils/funcs.js";
import { Draw } from "@olehermanse/utils/draw.js";

type NTacToeSymbol = "X" | "O" | " ";

class Rect {
  symbol: NTacToeSymbol = " ";
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

export class NTacToeMove implements sv.SchemaClass {
  s: NTacToeSymbol;
  r: number;
  c: number;

  constructor(s: NTacToeSymbol = "X", r: number = 0, c: number = 0) {
    this.s = s;
    this.r = r;
    this.c = c;
  }

  class_name(): string {
    return "NTacToeMove";
  }

  schema(): sv.Schema {
    return {
      properties: {
        s: { type: "string" },
        r: { type: "number" },
        c: { type: "number" },
      },
    };
  }

  is_valid(game: NTacToe) {
    // if (this.s !== game.next()) {
    //   console.log("Next does not match");
    //   return false;
    // }
    const r = this.r;
    const c = this.c;
    if (
      r < 0 ||
      c < 0 ||
      r >= game.n ||
      c >= game.n ||
      !Number.isInteger(r) ||
      !Number.isInteger(c)
    ) {
      console.log("Invalid row or column");
      return false;
    }
    const board = game.board;
    const i = r * game.n + c;
    if (board[i] !== " ") {
      console.log("Board space not empty");
      return false;
    }
    return true;
  }
}

export class NTacToe extends BaseGame {
  n: number;
  t: number;
  moves: NTacToeMove[];

  board: NTacToeSymbol[];
  rects: Rect[];
  combinations: number[][];
  game_over: boolean;
  cache_string: string;

  class_name(): string {
    return "NTacToe";
  }

  schema(): sv.Schema {
    const schema = super.base_schema();
    schema["properties"]["n"] = { type: "number" };
    schema["properties"]["t"] = { type: "number" };
    schema["properties"]["moves"] = { type: NTacToeMove, array: true };
    return schema;
  }

  constructor(n = 5, t = 4) {
    super();
    this.n = n;
    this.t = t;
    this.moves = [];

    // Cached, non-transmitted state:
    this.game_over = false;
    this.board = [];
    this.combinations = [];
    this.rects = [];
    this.cache_string = "Default";
  }

  refresh_cache() {
    const cache_string = sv.to_string(this);
    if (cache_string === this.cache_string) {
      return;
    }
    this.cache_string = cache_string;
    this.generate_board();
    this.generate_rects();
    this.generate_combinations();
    this.check_for_win();
  }

  index(r: number, c: number) {
    return this.n * r + c;
  }

  generate_board() {
    this.board = new Array(this.n * this.n).fill(" ");
    for (const move of this.moves) {
      if (!move.is_valid(this)) {
        console.log("Invalid move: " + sv.to_string(move));
        continue;
      }
      this.board[this.index(move.r, move.c)] = move.s;
    }
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
        rect.symbol = this.board[this.index(r, c)];
        this.rects.push(rect);
      }
    }
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
      if (current.length >= this.t) {
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
      if (current.length >= this.t) {
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
      if (current.length >= this.t) {
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
      if (current.length >= this.t) {
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
          if (streak.length === this.t) {
            this.mark_win(streak);
            return;
          }
          continue;
        }
        symbol = current;
        streak = [i];
        if (this.t === 1) {
          this.mark_win(streak);
        }
      }
    }
  }

  on_receive(game: BaseGame) {
    console.assert(game.name === this.name);
    console.assert(game instanceof NTacToe);
    if (!(game instanceof NTacToe)) {
      return;
    }
    const source: NTacToe = game;
    if (source.n != this.n || source.t != this.t) {
      this.n = source.n;
      this.t = source.t;
      this.moves = source.moves;
      this.refresh_cache();
      return;
    }
    if (source.moves.length <= this.moves.length) {
      return;
    }
    this.moves = source.moves;
    this.refresh_cache();
  }

  next(): NTacToeSymbol {
    const circles = this.moves.filter((m: NTacToeMove) => m.s === "O").length;
    const crosses = this.moves.filter((m: NTacToeMove) => m.s === "X").length;
    if (crosses < circles) {
      return "X";
    }
    return "O";
  }

  make_move(r: number, c: number, s: NTacToeSymbol) {
    const move = new NTacToeMove(s, r, c);
    if (move.is_valid(this)) {
      this.moves.push(move);
      this.schedule_sync();
      this.refresh_cache();
    }
  }

  mouse_click(x: number, y: number) {
    this.refresh_cache();
    if (this.game_over) {
      return;
    }
    const len = this.rects.length;
    for (let i = 0; i < len; i++) {
      const rect = this.rects[i];
      if (!rect.contains(x, y)) {
        continue;
      }
      const r = limit(0, Math.floor(i / this.n), this.n - 1);
      const c = limit(0, Math.floor(i % this.n), this.n - 1);
      this.make_move(r, c, this.next());
    }
  }

  draw(ctx: any) {
    this.refresh_cache();
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
          4,
        );
        Draw.line(
          ctx,
          rect.x + 0.8 * rect.w,
          rect.y + 0.2 * rect.h,
          rect.x + 0.2 * rect.w,
          rect.y + 0.8 * rect.h,
          rect.highlight ? "yellow" : "white",
          4,
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
          4,
        );
      }
    }
  }
}
