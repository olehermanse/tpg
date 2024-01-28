import { Application } from "./canvas_manager";
import { get_random_username } from "../libcommon/utils";
import { http_get, http_put } from "./http";
import { Chat } from "../libcommon/lobby";

let canvas_manager: Application | null = null;
let username: string | null = null;

function get_lobby_id() {
  return window.location.pathname.slice(1);
}

function get_cookie(key: string): string | null {
  const value = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${key}=`))
    ?.split("=")[1];
  if (value === undefined) {
    return null;
  }
  return value;
}

function set_cookie(key: string, value: string) {
  document.cookie = `${key}=${value}; Secure`;
}

function render_chat_log(chat_log: Chat | null) {
  if (chat_log === null) {
    return;
  }
  const chat = document.getElementById("chat-log");
  if (chat === null) {
    return;
  }
  chat.innerHTML = chat_log.messages
    .map((v) => v.username + ": " + v.body + "<br>")
    .reduce((accumulator, currentValue) => accumulator + currentValue, "");
}

function on_chat_send() {
  const input: HTMLInputElement = <HTMLInputElement>(
    document.getElementById("chat-input-text")
  );
  const message: string = input.value;
  if (message === "") {
    return;
  }
  input.value = "";
  http_put("/api/chat/" + get_lobby_id(), {
    username: username,
    message: message,
  }).then((data) => {
    render_chat_log(Chat.from(data));
  });
}

function chat_refresh() {
  const lobby = get_lobby_id();
  http_get("/api/chat/" + lobby).then((data) => {
    render_chat_log(Chat.from(data));
    setTimeout(() => {
      chat_refresh();
    }, 250);
  });
}

function username_init() {
  username = get_cookie("username");
  console.log("Existing username: " + username);
  if (username === undefined || username === "") {
    username = get_random_username();
    set_cookie("username", username);
    console.log("Created new username: " + username);
  }
}

function chat_init() {
  chat_refresh();
  let form = document.getElementById("chat-input-form");
  if (form === null) {
    return;
  }
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    on_chat_send();
  });
}

function canvas_init() {
  let canvas = document.getElementById("tpg-canvas") as HTMLCanvasElement;
  let scale = window.devicePixelRatio;
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    return;
  }
  canvas_manager = new Application(canvas, ctx, scale);
  // canvas.style.width = `${canvas_manager.width}px`;
  // canvas.style.height = `${canvas_manager.height}px`;

  window.setInterval(() => {
    if (canvas_manager != null) {
      canvas_manager.tick(10);
    }
  }, 10);
}

function start() {
  username_init();
  chat_init();
  canvas_init();
}

export { start };
