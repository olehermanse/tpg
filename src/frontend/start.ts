import { Application } from "./application.ts";
import {
  get_cookie,
  get_random_userid,
  get_random_username,
  set_cookie,
} from "../libcommon/utils";
import { http_get, http_put } from "./http.ts";
import { Lobby, runtime_tests } from "../libcommon/lobby.ts";
import { User } from "../libcommon/user.ts";
import * as sv from "../libcommon/schema.ts";
import { TicTacToe } from "../games/tic_tac_toe.ts";
import { RedDots } from "../games/red_dots.ts";
import { Fives } from "../games/fives.ts";
import { Twelves } from "../games/twelves.ts";
import { NTacToe } from "../games/ntactoe.ts";

let application: Application | null = null;

function get_lobby_id() {
  return window.location.pathname.slice(1);
}

function get_current_user(): User {
  const userid = get_cookie("userid") ?? "";
  const username = get_cookie("username") ?? "Unknown";
  return new User(userid, username);
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
    http_put("/api/lobbies/" + get_lobby_id() + "/games", data).then((data) => {
      const lobby = sv.to_class<Lobby>(data, new Lobby());
      if (lobby instanceof Error) {
        console.log("Creating a new NTacToe game failed:");
        console.log(lobby);
        return;
      }
      if (application === null) {
        console.log("Error: No application to update");
        return;
      }
      application.update_lobby(lobby);
      application.switch_game();
      links_init();
    });
    return;
  }
  if (command === "/tictactoe") {
    const data = new TicTacToe();
    http_put("/api/lobbies/" + get_lobby_id() + "/games", data).then((data) => {
      const lobby = sv.to_class<Lobby>(data, new Lobby());
      if (lobby instanceof Error) {
        console.log("Creating a new Tic Tac Toe game failed:");
        console.log(lobby);
        return;
      }
      if (application === null) {
        console.log("Error: No application to update");
        return;
      }
      application.update_lobby(lobby);
      application.switch_game();
      links_init();
    });
    return;
  }
  if (command === "/fives") {
    const data = new Fives();
    http_put("/api/lobbies/" + get_lobby_id() + "/games", data).then((data) => {
      const lobby = sv.to_class<Lobby>(data, new Lobby());
      if (lobby instanceof Error) {
        console.log("Creating a new Fives game failed:");
        console.log(lobby);
        return;
      }
      if (application === null) {
        console.log("Error: No application to update");
        return;
      }
      application.update_lobby(lobby);
      application.switch_game();
      links_init();
    });
    return;
  }
  if (command === "/twelves") {
    const data = new Twelves();
    http_put("/api/lobbies/" + get_lobby_id() + "/games", data).then((data) => {
      const lobby = sv.to_class<Lobby>(data, new Lobby());
      if (lobby instanceof Error) {
        console.log("Creating a new Twelves game failed:");
        console.log(lobby);
        return;
      }
      if (application === null) {
        console.log("Error: No application to update");
        return;
      }
      application.update_lobby(lobby);
      application.switch_game();
      links_init();
    });
    return;
  }
  if (command === "/reddots") {
    const data = new RedDots();
    http_put("/api/lobbies/" + get_lobby_id() + "/games", data).then((data) => {
      const lobby = sv.to_class<Lobby>(data, new Lobby());
      if (lobby instanceof Error) {
        console.log("Creating a new RedDots game failed:");
        console.log(lobby);
        return;
      }
      if (application === null) {
        console.log("Error: No application to update");
        return;
      }
      application.update_lobby(lobby);
      application.switch_game();
      links_init();
    });
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
  const form = document.getElementById("chat-input-form");
  if (form === null) {
    return;
  }
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    on_chat_send();
  });
}

function network_refresh(application: Application) {
  application.canvas_game.refresh();
  setTimeout(() => {
    network_refresh(application);
  }, 500);
}

function canvas_init() {
  const address = window.location.host;
  const canvas = document.getElementById("tpg-canvas") as HTMLCanvasElement;
  const scale = window.devicePixelRatio;
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    return;
  }
  const lobby = get_lobby_id();

  http_get("/api/lobbies/" + lobby).then((data) => {
    const lobby = sv.to_class<Lobby>(data, new Lobby());
    if (lobby instanceof Error) {
      console.log(lobby);
      return;
    }

    const user = get_current_user();
    application = new Application(canvas, ctx, scale, lobby, address, user);
    // canvas.style.width = `${application.width}px`;
    // canvas.style.height = `${application.height}px`;

    application.login(user);
    setInterval(() => {
      if (application != null) {
        application.tick(10);
      }
    }, 10);
    network_refresh(application);
    links_init();
  });
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
  user_init();
  chat_init();
  canvas_init();
  links_init();
  runtime_tests();
}

export { start };
