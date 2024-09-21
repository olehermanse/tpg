import {
  left_pad,
  standard_canvas_height,
  standard_canvas_width,
  xy,
} from "@olehermanse/utils/funcs.js";
import { XY } from "@olehermanse/utils";
import { Draw } from "@olehermanse/utils/draw.js";
import { BaseGame } from "../libcommon/game.ts";
import { Lobby, Message } from "../libcommon/lobby.ts";
import * as sv from "@olehermanse/utils/schema.js";
import { User } from "../libcommon/user.ts";
import {
  WebSocketAction,
  WebSocketMessage,
  WebSocketWrapper,
} from "../libcommon/websocket.ts";
import { game_selector_new } from "../games/game_selector.ts";
import { get_current_user, set_current_user } from "./start.ts";

function short_time(date: Date) {
  const hours = left_pad(date.getHours(), 2, "0");
  const minutes = left_pad(date.getMinutes(), 2, "0");
  return "[" + hours + ":" + minutes + "]";
}

export function get_lobby_id() {
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
  application: Application;

  constructor(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    scale: number,
    game: BaseGame,
    application: Application,
  ) {
    this.application = application;
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

  mouse_click(x: number, y: number, user: User): void {
    this.mouse = xy(x, y);
    this.game.mouse_click(this.mouse.x, this.mouse.y, user);
  }

  update_full_lobby(data: string | Lobby) {
    const lobby = sv.to_class(data, new Lobby());
    if (lobby instanceof Error) {
      console.log("Creating a new Lobby failed:");
      console.log(lobby);
      return;
    }
    if (lobby === null) {
      console.log("Error: lobby found");
      return;
    }

    const game = lobby.games[0];
    if (!(game instanceof BaseGame)) {
      console.log("Error: That's not a game");
      return;
    }
    this.game.receive(game);
  }

  push() {
    if (this.game.needs_sync) {
      this.game.needs_sync = false;
      this.application.websocket.send("update_game", this.game);
    }
    while (true) {
      const move = this.game.move_queue.shift();
      if (move === undefined) {
        break;
      }
      this.application.websocket.send("game_move", move);
    }
  }

  setup_events(canvas: HTMLCanvasElement) {
    canvas.addEventListener("mousedown", (e) => {
      const x = this.x_to_canvas(e.offsetX);
      const y = this.y_to_canvas(e.offsetY);
      const user = get_current_user();
      if (user === null) {
        return;
      }
      this.mouse_click(x, y, user);
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

export class FrontendWebSocket {
  websocket: WebSocketWrapper;
  application: Application | null;
  constructor(ws: WebSocket, onmessage: (msg: WebSocketMessage) => void) {
    this.websocket = new WebSocketWrapper(ws);
    this.websocket.onmessage = onmessage;
    this.application = null;
  }

  send(action: WebSocketAction, data: sv.SchemaClass) {
    if (this.application === null) {
      console.log("Not ready to send websocket messages");
      return;
    }
    const lobby = this.application.lobby.id;
    const game = this.application.canvas_game.game.id;
    const msg = new WebSocketMessage(
      action,
      lobby,
      game,
      sv.to_string(data, true),
    );
    this.websocket.send(msg);
  }
}

class Application {
  _active_game: number;
  canvas_game: CanvasGame;
  lobby: Lobby;
  websocket: FrontendWebSocket;
  user: User;
  address: string;
  queue: string[];

  constructor(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    scale: number,
    lobby: Lobby,
    address: string,
    user: User,
    websocket: FrontendWebSocket,
  ) {
    this.user = user;
    this.address = address;
    this.lobby = lobby;
    this._active_game = 0;
    this.queue = [];
    this.canvas_game = new CanvasGame(
      canvas,
      ctx,
      scale,
      this.get_active_game(),
      this,
    );
    this.websocket = websocket;
  }

  render_chat_log() {
    if (this.lobby === null) {
      return;
    }
    const chat_element = document.getElementById("chat-log");
    if (chat_element === null) {
      return;
    }
    chat_element.innerHTML = this.lobby.chat.messages
      .map(
        (v: Message) =>
          short_time(new Date(v.timestamp)) +
          " <b>" +
          v.user.username +
          ":</b> " +
          v.body +
          "<br>",
      )
      .reduce((accumulator, currentValue) => accumulator + currentValue, "");
  }

  render_links() {
    const links = document.getElementById("links");
    if (links === null) {
      return;
    }
    const lobby = "/api/lobbies/" + get_lobby_id();
    const game = lobby + "/games/" + this.canvas_game.game.id;
    const chat = "/api/chat/" + get_lobby_id();
    links.innerHTML =
      `<a href="${lobby}">Lobby</a> <a href="${game}">Game</a> <a href="${chat}">Chat</a>`;
  }

  ws_receive(message: WebSocketMessage) {
    if (message.action === "lobby") {
      const lobby = sv.to_class(message.payload, new Lobby());
      if (lobby instanceof Error) {
        console.log("Received invalid lobby");
        console.log(message.payload);
        return;
      }
      this.update_lobby(lobby);
      return;
    }
    if (message.lobby_id !== this.lobby?.id) {
      return;
    }
    if (message.action === "chat") {
      const chat_message = sv.to_class(message.payload, new Message());
      if (chat_message instanceof Error) {
        console.log("Received invalid chat message");
        console.log(message.payload);
        return;
      }
      this.lobby.chat.messages.push(chat_message);
      this.render_chat_log();
      return;
    }
    if (message.action === "update_game") {
      const game = game_selector_new(message.payload);
      if (game === null) {
        console.log("Received invalid game");
        console.log(message.payload);
        return;
      }
      this.canvas_game.game.receive(game);
      return;
    }
    if (message.action === "game_move") {
      this.canvas_game.game.receive_move(message.payload);
      return;
    }
    if (message.action === "username") {
      const user: User | Error = sv.to_class(message.payload, new User());
      if (user instanceof Error) {
        console.log("Received invalid user");
        return;
      }
      this.lobby.change_username(user);
      const current_user = get_current_user();
      if (current_user === null || current_user.userid !== user.userid) {
        return;
      }
      current_user.username = user.username;
      set_current_user(current_user);
      return;
    }
    if (message.action === "replace_game") {
      const game = game_selector_new(message.payload);
      if (game === null) {
        console.log("Received invalid game");
        console.log(message.payload);
        return;
      }
      this.lobby.games = [game];
      this.set_active_game(0);
      this.render_links();
      return;
    }
    console.log(
      `Error: action "${message.action}" not implemented client-side`,
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
    this.render_chat_log();
  }

  tick(_ms: number) {
    this.canvas_game.draw();
  }

  switch_game() {
    if (this === null) {
      return;
    }
    if (this.lobby.games.length <= 1) {
      return;
    }
    // const game_id = this.lobby.games[0].id;
    // http_delete("/api/lobbies/" + this.lobby.id + "/games/" + game_id).then(
    //   (_data: any) => {
    //     console.log("Deleted first game");
    //     // this.get_lobby();
    //   },
    // );
  }

  send_chat_message(text: string) {
    const user = this.user;
    const message = new Message(user, text);
    this.websocket.send("chat", message);
  }
}

export { Application };
