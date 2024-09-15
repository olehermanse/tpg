import { Application, FrontendWebSocket } from "./application.ts";
import { get_cookie, http_post } from "@olehermanse/utils/funcs.js";
import { Lobby, runtime_tests } from "../libcommon/lobby.ts";
import { User } from "../libcommon/user.ts";
import * as sv from "@olehermanse/utils/schema.js";
import { TicTacToe } from "../games/tic_tac_toe.ts";
import { RedDots } from "../games/red_dots.ts";
import { Fives } from "../games/fives.ts";
import { Twelves } from "../games/twelves.ts";
import { NTacToe } from "../games/ntactoe.ts";
import { WebSocketMessage } from "../libcommon/websocket.ts";

let application: Application | null = null;

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

// function set_current_user(user: User) {
//   set_cookie("userid", user.userid);
//   set_cookie("username", user.username);
// }

function on_chat_command(command: string) {
  const regex = /^\/n ([1-9][0-9]*) ([1-9][0-9]*)$/;
  const match = command.match(regex);
  if (match != null) {
    const n = Number(match[1]);
    const t = Number(match[2]);
    const data = new NTacToe(n, t);
    application?.websocket.send("new-game", data);
    return;
  }
  if (command === "/tictactoe") {
    const data = new TicTacToe();
    application?.websocket.send("new-game", data);
    return;
  }
  if (command === "/fives") {
    const data = new Fives();
    application?.websocket.send("new-game", data);
    return;
  }
  if (command === "/twelves") {
    const data = new Twelves();
    application?.websocket.send("new-game", data);
    return;
  }
  if (command === "/reddots") {
    const data = new RedDots();
    application?.websocket.send("new-game", data);
    return;
  }
  if (command.startsWith("/username ")) {
    // const user = get_current_user();
    // const new_username = command.slice(10);
    // const message = new Message(user, "Changing username to " + new_username);
    //    http_put("/api/chat/" + get_lobby_id(), message).then((data) => {
    //      const chat = sv.to_class<Chat>(data, new Chat());
    //      if (chat instanceof Error) {
    //        console.log(chat);
    //        return;
    //      }
    //      application.render_chat_log(chat);
    //      user.username = new_username;
    //      set_current_user(user);
    //    });
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
  const obj = { "url": window.location.href };
  http_post("/api/auth/" + lobby_id, obj).then((data) => {
    console.log("Received from auth: " + JSON.stringify(data));
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
  const websocket = new FrontendWebSocket(
    new WebSocket(`${protocol}//${address}/api/ws/${lobby_id}`),
    (msg: WebSocketMessage) => {
      console.log("Received message: " + msg.action);
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
      console.log("Application created");
      console.log("Here is the game:");
      console.log(sv.to_string(application.canvas_game.game));
      console.log("Here is the game's lobby:");
      console.log(sv.to_string(application.lobby));
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
  const links = document.getElementById("links");
  if (links === null) {
    return;
  }
  if (application === null) {
    return;
  }
  const lobby = "/api/lobbies/" + get_lobby_id();
  const game = lobby + "/games/" + application.canvas_game.game.id;
  const chat = "/api/chat/" + get_lobby_id();
  links.innerHTML =
    `<a href="${lobby}">Lobby</a> <a href="${game}">Game</a> <a href="${chat}">Chat</a>`;
}

function start() {
  chat_init();
  canvas_init();
  links_init();
  runtime_tests();
}

export { start };
