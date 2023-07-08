import { Application } from "./canvas_manager";

let canvas_manager = null;

function on_chat_send() {
  let chat = document.getElementById("chat_log");
  let text = chat.innerHTML;
  text += "<br>Ping";
  chat.innerHTML = text;
}

function start() {
  let form = document.getElementById("chat_input_form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    on_chat_send();
  });
  let canvas = document.getElementById("canvas") as HTMLCanvasElement;
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
