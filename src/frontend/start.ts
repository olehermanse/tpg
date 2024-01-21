import { Application } from "./canvas_manager";
import { get_random_username } from "../libcommon/utils";
import { http_get, http_put } from "./http";

let canvas_manager = null;
let username = null;

function get_lobby_id() {
  return window.location.pathname.slice(1);
}

function get_cookie(key) {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${key}=`))
    ?.split("=")[1];
}

function set_cookie(key, value) {
  document.cookie = `${key}=${value}; Secure`;
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

function network_init() {
  console.log("Pathname: " + window.location.pathname);
  const lobby = get_lobby_id();
  http_get("/api/chat/" + lobby).then((data) => {
    console.log("Chat:");
    console.log(data);
    render_chat_log(data);
  });
}

function render_chat_log(chat_log) {
  const chat = document.getElementById("chat-log");
  chat.innerHTML = chat_log.messages
    .map((v) => v.username + ": " + v.body + "<br>")
    .reduce((accumulator, currentValue) => accumulator + currentValue, "");
}

function on_chat_send() {
  const input = document.getElementById("chat-input-text");
  const message = input.value;
  if (message === "") {
    return;
  }
  input.value = "";
  http_put("/api/chat/" + get_lobby_id(), {
    username: username,
    message: message,
  }).then((data) => {
    render_chat_log(data);
  });
}

function start() {
  username_init();
  network_init();
  let form = document.getElementById("chat-input-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    on_chat_send();
  });
  let canvas = document.getElementById("tpg-canvas") as HTMLCanvasElement;
  let scale = window.devicePixelRatio;
  const ctx = canvas.getContext("2d");
  canvas_manager = new Application(canvas, ctx, scale);
  // canvas.style.width = `${canvas_manager.width}px`;
  // canvas.style.height = `${canvas_manager.height}px`;
  const ms = 10;
  window.setInterval(() => {
    canvas_manager.tick(ms);
  }, ms);
}

export { start };
