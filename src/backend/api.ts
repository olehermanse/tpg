import { Lobby, Message } from "../libcommon/lobby.ts";
import {
  get_random_userid,
  get_random_username,
  randint,
} from "@olehermanse/utils/funcs.js";
import * as sv from "@olehermanse/utils/schema.js";
import { User } from "../libcommon/user.ts";
import {
  WebSocketAction,
  WebSocketMessage,
  WebSocketWrapper,
} from "../libcommon/websocket.ts";
import { game_selector_new } from "../games/game_selector.ts";
import { BaseGame } from "../libcommon/game.ts";
import { NTacToe } from "../games/ntactoe.ts";

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

  update_game(game: BaseGame) {
    const target = this.lobby.find_game(game.id);
    if (target === null) {
      return;
    }
    target.receive(game);
    this.broadcast("update_game", sv.to_string(game), game.id);
  }

  replace_game(game: BaseGame) {
    this.lobby.games = [game];
    this.broadcast("replace_game", sv.to_string(game), game.id);
    if (game instanceof NTacToe) {
      this.system_message(
        `New game created: ${game.n}x${game.n} n-tac-toe to ${game.t}`,
      );
    }
  }

  broadcast(action: WebSocketAction, payload: string, game_id?: string) {
    const message = new WebSocketMessage(
      action,
      this.lobby.id,
      game_id,
      payload,
    );
    ws_broadcast(this.lobby, message);
  }

  system_message(message: string) {
    const msg = new Message(new User("0", "System"), message);
    this.lobby.chat.messages.push(msg);
    this.broadcast("chat", sv.to_string(msg));
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
  if (data.action === "update_game") {
    const game = game_selector_new(data.payload);
    if (game === null) {
      return;
    }
    const lobby_id = data.lobby_id;
    const lobby = get_backend_lobby(lobby_id);
    if (lobby === null) {
      console.log(
        "Error: Received update_game message for non-existing lobby: " +
          lobby_id,
      );
      return;
    }
    lobby.update_game(game);
    return;
  }
  if (data.action === "username") {
    const user = sv.to_class(data.payload, new User());
    if (user instanceof Error) {
      console.log("Error: Invalid user received");
      return;
    }
    const lobby_id = data.lobby_id;
    const lobby = get_backend_lobby(lobby_id);
    if (lobby === null) {
      console.log(
        "Error: Received username message for non-existing lobby: " + lobby_id,
      );
      return;
    }
    if (connection.remote_user === undefined) {
      console.log("Error: Unclear user for username change");
      return;
    }
    if (user.userid !== connection.remote_user.userid) {
      console.log("Error: Attempted to change username of another user");
      return;
    }
    lobby.system_message(
      `The user '${connection.remote_user.username}' changed name to '${user.username}'.`,
    );
    connection.remote_user.username = user.username;
    lobby.lobby.change_username(user);
    ws_broadcast(lobby.lobby, data);
    return;
  }
  if (data.action === "replace_game") {
    const game = game_selector_new(data.payload);
    if (game === null) {
      return;
    }
    const lobby_id: string = data.lobby_id;
    const lobby: BackendLobby | null = get_backend_lobby(lobby_id);
    if (lobby === null) {
      console.log(
        "Error: Received replace_game message for non-existing lobby: " +
          lobby_id,
      );
      return;
    }
    lobby.replace_game(game);
    return;
  }
  if (data.action === "chat") {
    if (connection.remote_user === undefined) {
      console.log("Error: User not logged in - " + data.payload);
      return;
    }
    if (lobby === null) {
      console.log("Error: Missing lobby for chat message - " + data.payload);
      return;
    }
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
    return;
  }
  if (data.action === "game_move") {
    const user = connection.remote_user;
    if (user === undefined) {
      console.log("Error: remote user undefined");
      return;
    }
    const lobby_id = data.lobby_id;
    const lobby = get_lobby(lobby_id);
    if (lobby === null) {
      console.log(
        "Error: Received update_game message for non-existing lobby: " +
          lobby_id,
      );
      return;
    }
    const game: BaseGame = lobby.games[0];
    if (game.id !== data.game_id) {
      console.log("Error: Wrong game");
      return;
    }
    game.receive_move(data.payload, user);
    ws_broadcast(lobby, data);
    return;
  }
  console.log(`Error: action "${data.action}" not implemented server-side`);
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

export function create_lobby(): string {
  let lobby_id = "" + randint(10_000, 99_999);
  while (get_lobby(lobby_id) != null) {
    lobby_id = "" + randint(10_000, 99_999);
  }
  const lobby = new Lobby(lobby_id);
  const backend_lobby = new BackendLobby(lobby);
  lobbies[lobby_id] = backend_lobby;
  backend_lobby.system_message("New lobby created.");
  backend_lobby.system_message(
    `New ${lobby.games[0].class_name()} game created.`,
  );
  return lobby_id;
}

export function api_lobby_exists(lobby_id: string): boolean {
  return get_lobby(lobby_id) !== null;
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
    console.log("Error: Failed ws user");
    ctx.throw(404);
    return;
  }
  const lobby = get_backend_lobby(lobby_id);
  if (lobby === null) {
    console.log("Error: Failed ws lobby");
    ctx.throw(404);
    return;
  }
  const ws = new BackendWebSocket(ctx.upgrade(), user);
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
  if (user === "" || auth === "") {
    console.log("Error: Missing headers");
    return create_new_session(ctx);
  }
  if (user === null || auth === null) {
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
  if (user.length === 0 || auth.length === 0) {
    console.log("Error: Missing headers");
    return create_new_session(ctx);
  }

  const user_object = sv.to_class(user, new User());
  if (user_object instanceof Error) {
    console.log("Error: Invalid user object");
    return ctx.throw(404);
  }
  if (!auth_is_valid(auth, user_object)) {
    console.log("Error: Invalid auth");
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

// These GET APIs are not necessary for the game / app to work,
// they're only used for testing / the links to show JSON data.
export function api_get_game(lobby_id: string, game_id: string): string | null {
  const lobby = get_lobby(lobby_id);
  if (lobby === null) {
    return null;
  }
  const game = lobby.find_game(game_id);
  if (game === null) {
    return null;
  }
  return sv.to_string(game, true);
}

export function api_get_chat(lobby_id: string): string | null {
  const lobby = get_lobby(lobby_id);
  if (lobby === null) {
    return null;
  }
  return sv.to_string(lobby.chat, true);
}

export function api_get_lobby(lobby_id: string): string | null {
  const lobby = get_lobby(lobby_id);
  if (lobby === null) {
    return null;
  }
  return sv.to_string(lobby, true);
}
