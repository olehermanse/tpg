import { Application, FrontendWebSocket } from "./application.ts";
import {
  get_cookie,
  http_post,
  limit,
  set_cookie,
} from "@olehermanse/utils/funcs.js";
import { Lobby, Message } from "../libcommon/lobby.ts";
import { User } from "../libcommon/user.ts";
import * as sv from "@olehermanse/utils/schema.js";
import { RedDots } from "../games/red_dots.ts";
import { NTacToe } from "../games/ntactoe.ts";
import { WebSocketMessage } from "../libcommon/websocket.ts";

let application: Application | null = null;
let websocket: FrontendWebSocket | null = null;

function get_lobby_id() {
  return window.location.pathname.slice(1);
}

export function get_current_user(): User | null {
  const user_string = get_cookie("User") ?? "";
  if (user_string === "") {
    return null;
  }
  const user = sv.to_class(user_string, new User());
  if (user instanceof Error) {
    return null;
  }
  return user;
}

export function set_current_user(user: User) {
  set_cookie(
    "User",
    sv.to_string(user) + "; Secure; Path=/; SameSite=Strict; Max-Age=86400",
  );
  if (application === null) {
    return;
  }
  application.user = user;
}

// function set_current_user(user: User) {
//   set_cookie("userid", user.userid);
//   set_cookie("username", user.username);
// }

function on_chat_command(command: string) {
  const user = get_current_user();
  if (user === null) {
    console.log("No");
    return;
  }
  const message = new Message(user, command);
  application?.websocket.send("chat", message);
  const regex = /^\/[nN] ([1-9][0-9]*) ([1-9][0-9]*)( [2-3])?$/;
  const match = command.match(regex);
  if (match != null) {
    const n = limit(3, Number(match[1]), 20);
    const t = limit(2, Number(match[2]), n);
    let p = 2;
    if (match[3] !== undefined) {
      p = Number(match[3]);
    }
    if (p !== 2 && p !== 3) {
      p = 2;
    }
    const data = new NTacToe(n, t, p);
    application?.websocket.send("replace_game", data);
    return;
  }
  if (command === "/tictactoe") {
    const data = new NTacToe(3, 3);
    application?.websocket.send("replace_game", data);
    return;
  }
  if (command === "/fives") {
    const data = new NTacToe(5, 4);
    application?.websocket.send("replace_game", data);
    return;
  }
  if (command === "/twelves") {
    const data = new NTacToe(12, 5);
    application?.websocket.send("replace_game", data);
    return;
  }
  if (command === "/reddots") {
    const data = new RedDots();
    application?.websocket.send("replace_game", data);
    return;
  }
  if (command.startsWith("/username ")) {
    const user = get_current_user();
    if (user === null) {
      return;
    }
    const new_username = command.slice(10);
    user.username = new_username;

    application?.websocket.send("username", user);
    return;
  }
  console.log("Uknown command: " + command);
}

function on_chat_send() {
  const input: HTMLInputElement = <HTMLInputElement> (
    document.getElementById("chat-input-text")
  );
  const body: string = input.value;
  if (body === "") {
    return;
  }
  if (body[0] === "/") {
    on_chat_command(body);
    input.value = "";
    return;
  }
  input.value = "";
  application?.send_chat_message(body);
}

function chat_init() {
  const form = document.getElementById("chat-input-form");
  if (form === null) {
    return;
  }
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    on_chat_send();
  });
}

function canvas_init() {
  const lobby_id = get_lobby_id();
  const obj = { url: window.location.href };
  http_post("/api/auth/" + lobby_id, obj).then((data) => {
    const user = sv.to_class(data, new User());
    if (user instanceof Error) {
      return;
    }
    init_ws();
  });
}

function init_ws() {
  const canvas = document.getElementById("tpg-canvas") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    return;
  }
  const address = window.location.host;
  const scale = window.devicePixelRatio;
  const lobby_id = get_lobby_id();
  let protocol = "ws:";
  if (window.location.protocol === "https:") {
    protocol = "wss:";
  }
  websocket = new FrontendWebSocket(
    new WebSocket(`${protocol}//${address}/api/ws/${lobby_id}`),
    (msg: WebSocketMessage) => {
      if (application !== null) {
        application.ws_receive(msg);
        return;
      }
      if (msg.action !== "lobby") {
        console.log("Application lobby not ready");
        return;
      }
      const user = get_current_user();
      if (user === null) {
        console.log("Missing user");
        return;
      }
      const lobby = sv.to_class(msg.payload, new Lobby());
      if (lobby instanceof Error) {
        console.log("Invalid lobby");
        return;
      }
      if (websocket === null) {
        return;
      }
      application = new Application(
        canvas,
        ctx,
        scale,
        lobby,
        address,
        user,
        websocket,
      );
      application.websocket.application = application;
      application.update_lobby(lobby);
      setInterval(() => {
        if (application != null) {
          application.tick(10);
        }
      }, 10);
      links_init();
      return;
    },
  );
}

function links_init() {
  if (application === null) {
    return;
  }
  application.render_links();
}

function start() {
  chat_init();
  canvas_init();
  links_init();
}

export { start };
