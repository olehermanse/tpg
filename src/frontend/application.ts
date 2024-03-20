import {
  standard_canvas_height,
  standard_canvas_width,
  xy,
} from "../libcommon/utils";
import { XY } from "../libcommon/interfaces.ts";
import { Draw } from "../libdraw/draw";
import { BaseGame } from "../libcommon/game.ts";
import { game_selector, Lobby } from "../libcommon/lobby.ts";
import { http_delete, http_get, http_put } from "./http.ts";
import * as sv from "../libcommon/schema.ts";

function get_lobby_id() {
  return window.location.pathname.slice(1);
}

class CanvasGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  scale: number;
  canvas_width: number;
  canvas_height: number;
  real_canvas_width: number;
  real_canvas_height: number;
  mouse: XY;
  game: BaseGame;

  constructor(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    scale: number,
    game: BaseGame,
  ) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.scale = scale;
    this.canvas_width = standard_canvas_width();
    this.canvas_height = standard_canvas_height();
    this.real_canvas_width = Math.floor(this.scale * this.canvas_width);
    this.real_canvas_height = Math.floor(this.scale * this.canvas_height);
    canvas.width = this.real_canvas_width;
    canvas.height = this.real_canvas_height;
    this.mouse = xy(0, 0);
    this.game = game;
    this.setup_events(canvas);
  }

  x_to_canvas(x: number) {
    return Math.round(
      (x / this.canvas.getBoundingClientRect().width) * this.canvas_width,
    );
  }

  y_to_canvas(y: number) {
    return Math.round(
      (y / this.canvas.getBoundingClientRect().height) * this.canvas_height,
    );
  }

  draw() {
    Draw.rectangle(
      this.ctx,
      0,
      0,
      this.canvas_width,
      this.canvas_height,
      "#000000",
    );
    this.game.draw(this.ctx);
  }

  mouse_click(x: number, y: number): void {
    this.mouse = xy(x, y);
    this.game.mouse_click(this.mouse.x, this.mouse.y);
  }

  refresh() {
    const lobby_id = get_lobby_id();
    const game_id = this.game.id;
    http_get("/api/lobbies/" + lobby_id + "/games/" + game_id).then((data) => {
      const game = sv.to_class_selector(data, game_selector);
      if (game instanceof Error) {
        console.log("Creating a new Tic Tac Toe game failed:");
        console.log(game);
        return;
      }
      if (game === null) {
        console.log("Error: No game to update");
        return;
      }
      if (game instanceof BaseGame) {
        this.game.receive(game);
      }
    });
  }

  push() {
    if (this.game.needs_sync) {
      this.game.needs_sync = false;
      const lobby_id = get_lobby_id();
      const game_id = this.game.id;
      const data = sv.to_object(this.game);
      http_put("/api/lobbies/" + lobby_id + "/games/" + game_id, data).then(
        (data) => {
          const game = sv.to_class_selector(data, game_selector);
          if (game instanceof Error) {
            console.log("Creating a new Tic Tac Toe game failed:");
            console.log(game);
            return;
          }
          if (game === null) {
            console.log("Error: No game to update");
            return;
          }
          if (game instanceof BaseGame) {
            this.game.receive(game);
          }
          //this.update_game(game);
        },
      );
    }
  }

  setup_events(canvas: HTMLCanvasElement) {
    canvas.addEventListener("mousedown", (e) => {
      const x = this.x_to_canvas(e.offsetX);
      const y = this.y_to_canvas(e.offsetY);
      this.mouse_click(x, y);
      this.mouse_move(x, y);
      this.push();
    });

    canvas.addEventListener("mousemove", (e) => {
      const x = this.x_to_canvas(e.offsetX);
      const y = this.y_to_canvas(e.offsetY);
      this.mouse_move(x, y);
    });

    addEventListener("mouseup", (e) => {
      const x = this.x_to_canvas(e.offsetX);
      const y = this.y_to_canvas(e.offsetY);
      this.mouse_release(x, y);
      this.mouse_move(x, y);
      this.push();
    });

    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key === " ") {
          // Prevent spacebar from scrolling page
          // event.preventDefault();
        }
        this.key_down(event.key);
      },
      false,
    );

    document.addEventListener(
      "keyup",
      (event) => {
        this.key_up(event.key);
      },
      false,
    );
  }

  mouse_move(x: number, y: number) {
    this.mouse = xy(x, y);
  }

  mouse_release(x: number, y: number) {
    this.mouse = xy(x, y);
  }

  key_down(_key: string) {}

  key_up(_key: string) {}
}

class Application {
  _active_game: number;
  canvas_game: CanvasGame;
  lobby: Lobby;

  constructor(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    scale: number,
    lobby: Lobby,
  ) {
    this.lobby = lobby;
    this._active_game = 0;
    this.canvas_game = new CanvasGame(
      canvas,
      ctx,
      scale,
      this.get_active_game(),
    );
  }

  get_active_game(): BaseGame {
    return this.lobby.games[this._active_game];
  }

  set_active_game(index: number) {
    this._active_game = index;
    this.canvas_game.game = this.get_active_game();
  }

  update_lobby(lobby: Lobby) {
    this.lobby = lobby;
    this.set_active_game(0);
  }

  tick(_ms: number) {
    this.canvas_game.draw();
  }

  get_lobby() {
    http_get("/api/lobbies/" + this.lobby.id).then((data) => {
      const lobby = sv.to_class<Lobby>(data, new Lobby());
      if (lobby instanceof Error) {
        console.log("Received invalid lobby:");
        console.log(lobby);
        return;
      }
      this.update_lobby(lobby);
    });
  }

  switch_game() {
    if (this === null) {
      return;
    }
    if (this.lobby.games.length <= 1) {
      return;
    }
    const game_id = this.lobby.games[0].id;
    http_delete("/api/lobbies/" + this.lobby.id + "/games/" + game_id).then(
      (_data: any) => {
        console.log("Deleted first game");
        this.get_lobby();
      },
    );
  }
}

export { Application };
