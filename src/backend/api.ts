import { Lobby, Message } from "../libcommon/lobby.ts";
import {
  get_random_userid,
  get_random_username,
  randint,
} from "@olehermanse/utils/funcs.js";
import * as sv from "@olehermanse/utils/schema.js";
import { AuthObject, User } from "../libcommon/user.ts";
import { WebSocketMessage, WebSocketWrapper } from "../libcommon/websocket.ts";
import { BaseGame } from "../libcommon/game.ts";
import { game_selector } from "../games/game_selector.ts";

class BackendWebSocket {
  websocket: WebSocketWrapper;
  remote_user?: User;

  constructor(websocket: WebSocket, remote_user?: User) {
    this.remote_user = remote_user;
    this.websocket = new WebSocketWrapper(websocket);
    this.websocket.onmessage = (m: WebSocketMessage) => {
      handle_ws_message(this, m);
    };
  }

  send(msg: WebSocketMessage) {
    this.websocket.send(msg);
  }
}

class BackendLobby {
  lobby: Lobby;
  websockets: BackendWebSocket[];
  constructor(lobby: Lobby) {
    this.lobby = lobby;
    this.websockets = [];
  }
}

const lobbies: { [key: string]: BackendLobby } = {};
const users: { [key: string]: User } = {};
const sessions: { [key: string]: User } = {};

function ws_broadcast(lobby: Lobby, message: WebSocketMessage) {
  const websockets = lobbies[lobby.id].websockets;
  for (const websocket of websockets) {
    websocket.websocket.send(message);
  }
}

function handle_ws_message(
  connection: BackendWebSocket,
  data: WebSocketMessage,
) {
  const lobby_id = data.lobby_id;
  let lobby: Lobby | null = null;
  if (lobby_id !== "") {
    lobby = get_lobby(lobby_id);
    if (lobby === null) {
      return;
    }
  }
  const game_id = data.game_id;
  let game = null;
  if (game_id !== "") {
    if (lobby === null) {
      return;
    }
    game = lobby.find_game(game_id);
    if (game === null) {
      return;
    }
  }
  if (data.action === "login") {
    const user = sv.to_class(data.payload, new User());
    if (user instanceof Error) {
      console.log("Error: Could not convert user - " + data.payload);
      return;
    }
    if (lobby === null) {
      console.log("Error: Missing lobby for user - " + data.payload);
      return;
    }
    connection.remote_user = user;
    ws_broadcast(lobby, data);
    return;
  }

  if (data.action === "lobby") {
    console.log("Error: lobby command not implemented server-side");
    return;
  }

  if (lobby === null) {
    console.log("Error: Missing lobby for chat message - " + data.payload);
    return;
  }
  if (connection.remote_user === undefined) {
    console.log("Error: User not logged in - " + data.payload);
    return;
  }
  if (data.action === "chat") {
    const message = sv.to_class(data.payload, new Message());
    if (message instanceof Error) {
      console.log("Error: Could not convert message - " + data.payload);
      return;
    }
    if (message.user.userid !== connection.remote_user.userid) {
      console.log("Error: Wrong userid");
      return;
    }
    lobby.chat.add(message);
    ws_broadcast(lobby, data);
  }
  return;
}

function get_lobby(lobby_id: string): Lobby | null {
  if (lobby_id in lobbies) {
    return lobbies[lobby_id].lobby;
  }
  return null;
}

function get_backend_lobby(lobby_id: string): BackendLobby | null {
  if (lobby_id in lobbies) {
    return lobbies[lobby_id];
  }
  return null;
}

function get_game(lobby_id: string, game_id: string) {
  const lobby = get_lobby(lobby_id);
  if (lobby === null) {
    return null;
  }
  return lobby.find_game(game_id);
}

export function create_lobby(): string {
  let lobby_id = "" + randint(10_000, 99_999);
  while (get_lobby(lobby_id) != null) {
    lobby_id = "" + randint(10_000, 99_999);
  }
  const lobby = new Lobby(lobby_id);
  lobby.chat.messages.push(
    new Message(new User("0", "System"), "New lobby created"),
  );
  lobby.chat.messages.push(
    new Message(
      new User("0", "System"),
      `New ${lobby.games[0].class_name()} game created`,
    ),
  );
  lobbies[lobby_id] = new BackendLobby(lobby);
  return lobby_id;
}

function game_from_request(body: any) {
  const cls: sv.Class<BaseGame> | null = game_selector(body);
  if (cls === null) {
    return null;
  }
  const game = sv.to_class(body, new cls());
  if (game instanceof Error) {
    console.log("Error in to class");
    return null;
  }
  return game;
}

export function api_put_new_game(lobby_id: string, body: any) {
  const lobby = get_lobby(lobby_id);
  if (lobby === null) {
    return null;
  }
  const game = game_from_request(body);
  if (game === null) {
    return null;
  }

  lobby.games.push(game);
  lobby.chat.messages.push(
    new Message(new User("0", "System"), `Created new ${game.name} game`),
  );
  return sv.to_object(lobby);
}

export function api_put_game(lobby_id: string, game_id: string, body: any) {
  const lobby = get_lobby(lobby_id);
  if (lobby === null) {
    return null;
  }
  const game = lobby.find_game(game_id);
  if (game === null) {
    return null;
  }
  const received = game_from_request(body);
  if (received === null) {
    return null;
  }
  game.receive(received);
  return sv.to_object(game);
}

export function api_delete_game(lobby_id: string, game_id: string) {
  const lobby = get_lobby(lobby_id);
  if (lobby === null) {
    return null;
  }
  console.log("Deleting game");
  lobby.games = lobby.games.filter((game) => game.id !== game_id);
  return sv.to_object(lobby);
}

export function api_get_game(lobby_id: string, game_id: string) {
  const game = get_game(lobby_id, game_id);
  if (game === null) {
    return null;
  }
  return sv.to_object(game);
}

export function api_lobby_exists(lobby_id: string): boolean {
  return get_lobby(lobby_id) !== null;
}

export function api_post_login(lobby_id: string, body: any) {
  const lobby = get_lobby(lobby_id);
  if (lobby === null) {
    console.log("Error: Could not find lobby - " + lobby_id);
    return null;
  }
  const user = sv.to_class(body, new User());
  if (user instanceof Error) {
    console.log("Error: Could not convert user - " + body);
    return null;
  }
  lobby.login(user);
  return sv.to_object(lobby.chat);
}

export function api_get_chat(lobby_id: string) {
  const lobby = get_lobby(lobby_id);
  if (lobby === null) {
    return null;
  }
  return sv.to_object(lobby.chat);
}

export function api_put_chat(lobby_id: string, body: any) {
  const lobby = get_lobby(lobby_id);
  if (lobby === null) {
    console.log("Error: Could not find lobby - " + lobby_id);
    return null;
  }
  const message = sv.to_class(body, new Message());
  if (message instanceof Error) {
    console.log("Error: Could not convert message - " + body);
    return null;
  }
  lobby.chat.add(message);
  return sv.to_object(lobby.chat);
}

function get_user(ctx: any): User | null {
  const cookies = split_cookie(ctx.request.headers.get("Cookie"));
  const session: string = cookies["Session"] ?? "";
  const user_string: string = cookies["User"] ?? "";
  if (user_string === "" || session === "") {
    return null;
  }
  const user = sv.to_class(user_string, new User());
  if (user instanceof Error) {
    return null;
  }
  const userid = user.userid;
  return users[userid] ?? null;
}

export function api_ws(ctx, lobby_id: string) {
  const user = get_user(ctx);
  if (user === null) {
    console.log("Failed ws user");
    ctx.throw(404);
    return;
  }
  const lobby = get_backend_lobby(lobby_id);
  if (lobby === null) {
    console.log("Failed ws lobby");
    ctx.throw(404);
    return;
  }
  const ws = new BackendWebSocket(ctx.upgrade());
  const msg = new WebSocketMessage(
    "lobby",
    lobby_id,
    undefined,
    sv.to_string(lobby.lobby),
  );
  ws.send(msg);
  lobby.websockets.push(ws);
}

function create_new_session(ctx: any) {
  const lobby_id: string = ctx.params.lobby_id;
  const session: string = get_random_userid();
  const userid: string = get_random_userid();
  const username: string = get_random_username();
  const user: User = new User(userid, username);
  const user_string: string = sv.to_string(user);
  if (!(lobby_id in lobbies)) {
    lobbies[lobby_id] = new BackendLobby(new Lobby("/" + lobby_id));
  }
  users[userid] = user;
  sessions[session] = user;

  ctx.response.headers.set(
    "Set-Cookie",
    `Session=${session}; Secure; HttpOnly; Path=/api; SameSite=Strict; Max-Age=86400`,
  );
  ctx.response.headers.append(
    "Set-Cookie",
    `User=${user_string}; Secure; Path=/; SameSite=Strict; Max-Age=86400`,
  );
  ctx.response.body = sv.to_string(user);
}

function auth_is_valid(auth: string, user: User): boolean {
  if (auth === "" || user.userid === "" || user.username === "") {
    return false;
  }
  if (!(auth in sessions)) {
    return false;
  }
  const existing: User = sessions[auth];
  if (existing.userid === user.userid) {
    return true;
  }
  return false;
}

export function check_request_auth_headers(ctx: any): boolean {
  const cookies = split_cookie(ctx.request.headers.get("Cookie"));
  const auth: string = cookies["Session"] ?? "";
  const user: string = cookies["User"] ?? "";
  if (
    user === "" || auth === ""
  ) {
    console.log("Missing headers");
    return create_new_session(ctx);
  }
  if (
    user === null || auth === null
  ) {
    return false;
  }
  const user_object = sv.to_class(user, new User());
  if (user_object instanceof Error) {
    ctx.throw(404);
    return false;
  }
  return auth_is_valid(auth, user_object);
}

function split_cookie(cookie: string | null) {
  if (cookie === null) {
    return {};
  }
  const cookies: { [key: string]: string } = {};
  const segments = cookie.split("; ");
  for (const segment of segments) {
    if (!segment.includes("=")) {
      continue;
    }
    const parts = segment.split("=");
    if (parts.length !== 2) {
      continue;
    }
    cookies[parts[0]] = parts[1];
  }
  return cookies;
}

export function api_post_auth(ctx: any) {
  const cookies = split_cookie(ctx.request.headers.get("Cookie"));
  const auth: string = cookies["Session"] ?? "";
  const user: string = cookies["User"] ?? "";
  if (
    user.length === 0 || auth.length === 0
  ) {
    console.log("Missing headers");
    return create_new_session(ctx);
  }

  const user_object = sv.to_class(user, new User());
  if (user_object instanceof Error) {
    console.log("Invalid user object");
    return ctx.throw(404);
  }
  if (!auth_is_valid(auth, user_object)) {
    console.log("Invalid auth");
    return create_new_session(ctx);
  }

  if (!(user_object.userid in users)) {
    users[user_object.userid] = user_object;
  } else {
    users[user_object.userid].username = user_object.username;
  }

  ctx.response.body = sv.to_string(user_object);
  return;
}
