import { Application } from "./canvas_manager";

let canvas_manager = null;
const user = "Llama";

function get_lobby_id() {
  return window.location.pathname.slice(1);
}

async function http_get(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  return response.json();
}

async function http_put(url, data) {
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

async function http_post(url, data) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return response.json();
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
    .map((v) => v.user + ": " + v.body + "<br>")
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
    user: user,
    message: message,
  }).then((data) => {
    render_chat_log(data);
  });
}

function start() {
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
