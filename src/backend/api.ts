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
import { Use } from "../../../../.cache/deno/npm/registry.npmjs.org/@vitest/runner/2.1.1/dist/index.d.ts";

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
  lobbies[lobby_id] = lobby;
  return lobby_id;
}

function game_from_request(body) {
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

export function api_put_new_game(lobby_id, body) {
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

export function api_put_game(lobby_id, game_id, body) {
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

export function api_delete_game(lobby_id, game_id) {
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

export function api_get_lobby(lobby_id: string): object | null {
  const lobby = get_lobby(lobby_id);
  if (lobby === null) {
    return null;
  }
  return sv.to_object(lobby);
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

function get_user(ctx): User | null {
  const authorization: string | null = ctx.request.headers.get("Authorization");
  if (authorization === null) {
    return null;
  }
  const userid = authorization.split("|")[0];
  return new User(undefined, userid);
}

export function api_ws(ctx, lobby_id: string) {
  const user = get_user(ctx);
  if (user === null) {
    console.log("Failed ws user");
    ctx.throw(404);
    return;
  }
  const lobby = get_lobby(lobby_id);
  if (lobby === null) {
    console.log("Failed ws lobby");
    ctx.throw(404);
    return;
  }
  const ws = ctx.upgrade();
  const client = new BackendWebSocket(ws);
  const session = new Session(user, lobby, client);
  sessions.push(session);
}

export function api_check_auth(
  auth: string,
  auth_object?: AuthObject,
): string | null {
  const parts = auth.split("|");
  if (parts.length !== 2) {
    console.log("Failed auth split");
    return null;
  }
  const userid = parts[0];
  const secret = parts[1];

  if (userid.length === 0 || secret.length === 0) {
    console.log("Failed auth length");
    return null;
  }

  let existing: string | undefined = authorizations[userid];
  if (existing === undefined) {
    authorizations[userid] = auth;
    if (auth_object !== undefined) {
      // TODO
    }
    return auth;
  }
  if (existing === auth) {
    return auth;
  }
  console.log("Existing: " + existing);
  console.log("Authorization: " + auth);
  console.log("Failed secret");
  return null;
}

export function api_post_auth_old(
  body: any,
  authorization: string | null,
): string | null {
  const input = JSON.stringify(body);
  const obj = sv.to_class(input, new AuthObject());
  if (obj instanceof Error) {
    console.log("Failed conversion");
    return null;
  }
  const userid: string = obj.userid;
  if (userid.length === 0) {
    console.log("Failed userid");
    return null;
  }
  if (authorization !== null && !authorization.startsWith(userid + "|")) {
    console.log("Failed authorization");
    return null;
  }
  if (authorization === null) {
    return api_check_auth(userid + "|" + get_random_userid(), obj);
  }
  return api_check_auth(authorization, obj);
}

function create_new_auth(ctx: any) {
  const lobby_id: string = ctx.params.lobby_id;
  const auth: string = get_random_userid();
  const userid: string = get_random_userid();
  const username: string = get_random_username();
  const user: User = new User(userid, username);
  const user_string: string = sv.to_string(user);
  if (!(lobby_id in lobbies)) {
    lobbies[lobby_id] = new BackendLobby(new Lobby("/" + lobby_id));
  }
  users[userid] = user;
  sessions[auth] = user;

  ctx.response.headers.set(
    "Set-Cookie",
    `Authorization=${auth}; Secure; HttpOnly; Max-Age=86400`,
  );
  ctx.response.headers.set(
    "Set-Cookie",
    `User=${user_string}; Secure; Max-Age=86400`,
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
  const auth: string | null = ctx.request.headers.get("Authorization");
  const user: string | null = ctx.request.headers.get("User");
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

export function api_post_auth(ctx: any) {
  const auth: string | null = ctx.request.headers.get("Authorization");
  const user: string | null = ctx.request.headers.get("User");
  if (
    user === null || user.length === 0 || auth === null || auth.length === 0
  ) {
    return create_new_auth(ctx);
  }

  const user_object = sv.to_class(user, new User());
  if (user_object instanceof Error) {
    return ctx.throw(404);
  }
  if (!auth_is_valid(auth, user_object)) {
    return create_new_auth(ctx);
  }

  if (!(user_object.userid in users)) {
    users[user_object.userid] = user_object;
  } else {
    users[user_object.userid].username = user_object.username;
  }

  ctx.response.body = sv.to_string(user_object);
  return;
}
