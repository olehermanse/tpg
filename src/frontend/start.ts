import { Application } from "./application.ts";
import {
  get_cookie,
  get_random_userid,
  get_random_username,
  left_pad,
  set_cookie,
} from "../libcommon/utils";
import { http_get, http_put } from "./http";
import { Chat, Message, runtime_tests } from "../libcommon/lobby";
import { User } from "../libcommon/user.ts";
import * as sv from "../libcommon/schema.ts";

let application: Application | null = null;

function get_lobby_id() {
  return window.location.pathname.slice(1);
}

function short_time(date: Date) {
  const hours = left_pad(date.getHours(), 2, "0");
  const minutes = left_pad(date.getMinutes(), 2, "0");
  return "[" + hours + ":" + minutes + "]";
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

function get_current_user(): User {
  const userid = get_cookie("userid") ?? "";
  const username = get_cookie("username") ?? "Unknown";
  return new User(userid, username);
}

function set_current_user(user: User) {
  set_cookie("userid", user.userid);
  set_cookie("username", user.username);
}

function on_chat_command(command: string) {
  if (command.startsWith("/username ")) {
    const user = get_current_user();
    const new_username = command.slice(10);
    const message = new Message(user, "Setting username to " + new_username);
    http_put("/api/chat/" + get_lobby_id(), message).then((data) => {
      const chat = sv.to_class<Chat>(data, new Chat());
      if (chat instanceof Error) {
        console.log(chat);
        return;
      }
      render_chat_log(chat);
      user.username = new_username;
      set_current_user(user);
    });
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
  const user = get_current_user();
  const message = new Message(user, body);
  http_put("/api/chat/" + get_lobby_id(), message).then((data) => {
    const chat = sv.to_class<Chat>(data, new Chat());
    if (chat instanceof Error) {
      console.log(chat);
      return;
    }
    render_chat_log(chat);
  });
}

function chat_refresh() {
  const lobby = get_lobby_id();
  http_get("/api/chat/" + lobby).then((data) => {
    const chat = sv.to_class<Chat>(data, new Chat());
    if (chat instanceof Error) {
      console.log(chat);
      return;
    }
    render_chat_log(chat);
    setTimeout(() => {
      chat_refresh();
    }, 250);
  });
}

function user_init() {
  let username = get_cookie("username");
  console.log("Existing username: " + username);
  if (username === null || username === "") {
    username = get_random_username();
    set_cookie("username", username);
    console.log("Created new username: " + username);
  }
  let userid = get_cookie("userid");
  console.log("Existing userid: " + userid);
  if (userid === null || userid === "") {
    userid = get_random_userid();
    set_cookie("userid", userid);
    console.log("Created new userid: " + userid);
  }
}

function chat_init() {
  chat_refresh();
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
  const canvas = document.getElementById("tpg-canvas") as HTMLCanvasElement;
  const scale = window.devicePixelRatio;
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    return;
  }
  application = new Application(canvas, ctx, scale);
  // canvas.style.width = `${application.width}px`;
  // canvas.style.height = `${application.height}px`;

  setInterval(() => {
    if (application != null) {
      application.tick(10);
    }
  }, 10);
}

function start() {
  user_init();
  chat_init();
  canvas_init();
  runtime_tests();
}

export { start };
