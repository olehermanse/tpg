import { BaseGame, BaseGameMove } from "../libcommon/game.ts";
import * as sv from "@olehermanse/utils/schema.js";
import { cr, limit, xy } from "@olehermanse/utils/funcs.js";
import * as Draw from "@olehermanse/utils/draw.js";
import { User } from "../libcommon/user.ts";
import { CR } from "@olehermanse/utils";

type NTacToeSymbol = "X" | "O" | "▲" | " ";

class Rect {
  symbol: NTacToeSymbol = " ";
  highlight = false;
  x: number;
  y: number;
  w: number;
  h: number;
  cr: CR;

  constructor(
    x: number,
    y: number,
    w: number,
    h: number,
    c: number,
    r: number,
  ) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.cr = cr(c, r);
  }

  contains(x: number, y: number): boolean {
    return (
      x >= this.x && x <= this.x + this.w && y >= this.y && y <= this.y + this.h
    );
  }
}

export class NTacToeMove extends BaseGameMove {
  s: NTacToeSymbol;
  r: number;
  c: number;

  constructor(
    s: NTacToeSymbol = "X",
    r: number = 0,
    c: number = 0,
    user?: User,
  ) {
    super(user);
    this.s = s;
    this.r = r;
    this.c = c;
  }

  class_name(): string {
    return "NTacToeMove";
  }

  schema(): sv.Schema {
    const schema = super.schema();
    schema["properties"]["s"] = { type: "string" };
    schema["properties"]["r"] = { type: "number" };
    schema["properties"]["c"] = { type: "number" };
    return schema;
  }
}

export class NTacToe extends BaseGame {
  n: number;
  t: number;
  p: number;
  moves: NTacToeMove[];

  board: NTacToeSymbol[];
  rects: Rect[];
  combinations: number[][];
  game_over: boolean;
  cache_string: string;
  winner: NTacToeSymbol = " ";

  class_name(): string {
    return "NTacToe";
  }

  schema(): sv.Schema {
    const schema = super.base_schema();
    schema["properties"]["n"] = { type: "number" };
    schema["properties"]["t"] = { type: "number" };
    schema["properties"]["p"] = { type: "number" };
    schema["properties"]["moves"] = { type: NTacToeMove, array: true };
    return schema;
  }

  constructor(n = 5, t = 4, p = 2) {
    super();
    this.n = limit(3, n, 20);
    this.t = limit(2, t, n);
    this.p = limit(2, p, 3);
    this.moves = [];

    // Cached, non-transmitted state:
    this.game_over = false;
    this.board = [];
    this.combinations = [];
    this.rects = [];
    this.cache_string = "Default";
  }

  max_players(): number {
    return this.p;
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

  move_distance(symbol: NTacToeSymbol) {
    if (symbol === " ") {
      return 0;
    }
    if (this.moves.length === 0) {
      return 0;
    }
    let distance = 0;
    for (let i = this.moves.length - 1; i >= 0; i--) {
      distance += 1;
      if (this.moves[i].s === symbol) {
        return distance;
      }
    }
    return 0;
  }

  get_symbol_for_player(user: User): NTacToeSymbol {
    for (const move of this.moves) {
      if (move.user === undefined) {
        continue;
      }
      if (move.user.userid === user.userid) {
        return move.s;
      }
    }
    return " ";
  }

  can_make_move(user: User): boolean {
    if (this.game_over) {
      return false;
    }
    if (this.players.length < this.max_players()) {
      if (this.has_player(user.userid)) {
        return false;
      }
      return true;
    }
    if (
      this.players.length === this.max_players() &&
      !this.has_player(user.userid)
    ) {
      console.log("Error: No more player spots");
      return false;
    }

    console.assert(this.players.length === this.max_players());
    console.assert(this.moves.length >= this.players.length);

    const symbol = this.get_symbol_for_player(user);
    console.assert(symbol !== " ");
    if (symbol === " ") {
      return true;
    }
    const distance = this.move_distance(symbol);
    if (distance < this.max_players()) {
      return false;
    }

    console.assert(distance === this.max_players());
    return true;
  }

  is_valid_move(move: NTacToeMove, user: User): boolean {
    this.refresh_cache();
    if (!this.can_make_move(user)) {
      return false;
    }
    if (move.s !== this.next()) {
      return false;
    }
    const r = move.r;
    const c = move.c;
    if (
      r < 0 ||
      c < 0 ||
      r >= this.n ||
      c >= this.n ||
      !Number.isInteger(r) ||
      !Number.isInteger(c)
    ) {
      console.log("Error: Invalid row or column");
      return false;
    }
    const board = this.board;
    const i = r * this.n + c;
    if (board[i] !== " ") {
      console.log("Error: Board space not empty");
      return false;
    }
    return true;
  }

  generate_board() {
    this.board = new Array(this.n * this.n).fill(" ");
    for (const move of this.moves) {
      this.board[this.index(move.r, move.c)] = move.s;
    }
  }

  generate_rects() {
    const size = (this.height * 2) / 3;
    const half = size / 2;
    const w = size / this.n;
    const h = w;
    const center = xy(this.width / 2, this.height / 2);
    const top_left = xy(center.x - half, center.y - half - this.height * 0.05);
    this.rects = [];
    for (let r = 0; r < this.n; r++) {
      for (let c = 0; c < this.n; c++) {
        const x = top_left.x + c * w;
        const y = top_left.y + r * h;
        const rect = new Rect(x, y, w, h, c, r);
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
    this.winner = this.rects[streak[0]].symbol;
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
          return;
        }
      }
    }
    if (this.moves.length === this.n * this.n) {
      this.game_over = true;
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

  create_move(payload: string | BaseGameMove): NTacToeMove | Error {
    const move = sv.to_class(payload, new NTacToeMove());
    return move;
  }

  on_receive_move(payload: BaseGameMove, user?: User): boolean {
    const move = this.create_move(payload);
    if (move instanceof Error) {
      return false;
    }
    if (move.user === undefined) {
      return false;
    }
    if (user === undefined) {
      user = move.user;
    }
    if (!this.is_valid_move(move, user)) {
      return false;
    }
    this.moves.push(move);
    if (!this.has_player(user.userid)) {
      this.players.push(user);
    }
    return true;
  }

  next(): NTacToeSymbol {
    if (this.moves.length === 0) {
      return "O";
    }
    const last = this.moves[this.moves.length - 1].s;
    console.assert(last !== " ");
    if (last === " ") {
      return " ";
    }
    if (last === "O") {
      return "X";
    }
    if (last === "▲") {
      return "O";
    }
    console.assert(last === "X");
    if (this.max_players() === 3) {
      return "▲";
    }
    return "O";
  }

  mouse_click(x: number, y: number, user: User) {
    const len = this.rects.length;
    for (let i = 0; i < len; i++) {
      const rect = this.rects[i];
      if (!rect.contains(x, y)) {
        continue;
      }
      const r = limit(0, Math.floor(i / this.n), this.n - 1);
      const c = limit(0, Math.floor(i % this.n), this.n - 1);
      const s = this.next();
      const move = new NTacToeMove(s, r, c, user);
      this.submit_move(move, user);
      return;
    }
  }

  draw_bottom_text(ctx: any, message: string) {
    Draw.text(
      ctx,
      0.5 * this.width,
      0.9 * this.height,
      message,
      "white",
      this.height / 16,
    );
  }

  draw(ctx: any) {
    this.refresh_cache();
    if (this.moves.length === 0) {
      this.draw_bottom_text(ctx, "Anyone can make the first move.");
    } else if (this.game_over) {
      if (this.winner === " ") {
        this.draw_bottom_text(ctx, "Game over - draw!");
      } else if (this.winner === "X") {
        this.draw_bottom_text(ctx, "Player X wins!");
      } else if (this.winner === "O") {
        this.draw_bottom_text(ctx, "Player O wins!");
      }
    }
    const last_move = this.moves.length === 0
      ? null
      : this.moves[this.moves.length - 1];
    for (const rect of this.rects) {
      Draw.rectangle(ctx, rect.x, rect.y, rect.w, rect.h, null, "white", 4);
      if (last_move === null || rect.symbol === " ") {
        continue;
      }
      let color = "white";
      if (rect.highlight) {
        color = "green";
      } else if (rect.cr.c === last_move.c && rect.cr.r === last_move.r) {
        color = "#9999ff";
      }
      if (rect.symbol === "O") {
        const radius = rect.w / 2;
        const x = rect.x + radius;
        const y = rect.y + radius;
        Draw.circle(ctx, x, y, 0.8 * radius, null, color, 4);
        continue;
      }
      const left = rect.x + 0.2 * rect.w;
      const right = rect.x + 0.8 * rect.w;
      const top = rect.y + 0.2 * rect.h;
      const bottom = rect.y + 0.8 * rect.h;
      if (rect.symbol === "X") {
        Draw.line(ctx, left, top, right, bottom, color, 4);
        Draw.line(ctx, right, top, left, bottom, color, 4);
      }
      if (rect.symbol === "▲") {
        const center = rect.x + 0.5 * rect.w;
        Draw.line(ctx, left, bottom, right, bottom, color, 4);
        Draw.line(ctx, left, bottom, center, top, color, 4);
        Draw.line(ctx, right, bottom, center, top, color, 4);
      }
    }
  }
}
