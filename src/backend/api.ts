import { Lobby, Message } from "../libcommon/lobby.ts";
import { randint } from "../libcommon/utils.ts";
import * as sv from "../libcommon/schema.ts";
import { User } from "../libcommon/user.ts";
import { TicTacToe } from "../games/tic_tac_toe.ts";
import { RedDots } from "../games/red_dots.ts";
import { BaseGame } from "../libcommon/game.ts";

type HTTPMethod = "GET" | "PUT" | "DELETE" | "POST" | "UNKNOWN";

function http_method(s: string): HTTPMethod {
  if (["GET", "PUT", "DELETE", "POST"].includes(s)) {
    return <HTTPMethod> s;
  }
  return "UNKNOWN";
}

function strip_suffix(string: string, suffix: string) {
  if (!string.endsWith(suffix)) {
    return string;
  }
  return string.slice(0, string.length - suffix.length);
}

function strip_both(prefix: string, string: string, suffix: string) {
  return strip_prefix(prefix, strip_suffix(string, suffix));
}

function strip_prefix(prefix: string, string: string) {
  if (!string.startsWith(prefix)) {
    return string;
  }
  return string.slice(prefix.length);
}

const lobbies: { [key: string]: Lobby } = {};

export function get_lobby(lobby_id: string): Lobby | null {
  if (lobby_id in lobbies) {
    return lobbies[lobby_id];
  }
  return null;
}

export function get_game(lobby_id: string, game_id: string) {
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

export function not_found(_request: Request) {
  return new Response("404 Not Found", { status: 404 });
}

function json_response(json: string): Response {
  const headers: HeadersInit = { "content-type": "application/json" };
  const response = new Response(json, { headers: headers });
  return response;
}

function game_from_request(body) {
  let cls: sv.Class<BaseGame> | null = null;
  if (body instanceof Object) {
    console.log("Object");
    if (body.name === "RedDots") {
      console.log("RedDots");
      cls = RedDots;
    } else if (body.name === "TicTacToe") {
      console.log("TicTacToe");
      cls = TicTacToe;
    }
  }
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

async function put_lobbies_new_game(path: string, request: any) {
  if (!path.endsWith("/games")) {
    return not_found(request);
  }
  const lobby_id = strip_both("/api/lobbies", path, "/games");
  const lobby = get_lobby(lobby_id);
  if (lobby === null) {
    return not_found(request);
  }
  const game = game_from_request(request);
  if (game === null) {
    return not_found(request);
  }
  lobby.games.push(game);
  lobby.chat.messages.push(
    new Message(new User("0", "System"), `Created new ${game.name} game`),
  );
  return json_response(sv.to_string(lobby));
}

async function api_lobbies(method: HTTPMethod, path: string, request: any) {
  if (!["GET", "PUT", "DELETE"].includes(method)) {
    return not_found(request);
  }
  // "/api/lobbies/18348/games/00989218426364"
  const segments = path.split("/").filter((x) => x.length > 0);
  if (segments.length < 3 || segments.length > 5) {
    return not_found(request);
  }
  if (segments[0] != "api" || segments[1] != "lobbies") {
    return not_found(request);
  }
  const lobby_id = "/" + segments[2];
  const lobby = get_lobby(lobby_id);
  if (lobby === null) {
    return not_found(request);
  }
  if (method === "GET" && segments.length === 3) {
    return json_response(sv.to_string(lobby, true));
  }
  if (segments[3] != "games") {
    return not_found(request);
  }
  if (segments.length === 4) {
    if (method === "PUT") {
      return put_lobbies_new_game(path, request);
    }
    return not_found(request);
  }
  if (segments.length === 5) {
    const game_id = segments[4];
    const game = lobby.find_game(game_id);
    if (game === null) {
      return not_found(request);
    }
    if (method === "DELETE") {
      console.log("Deleting game");
      lobby.games = lobby.games.filter((game) => game.id !== game_id);
      return json_response("{}");
    }
    if (method === "GET") {
      return json_response(sv.to_string(game, true));
    }
    const received = game_from_request(request);
    if (received === null) {
      return not_found(request);
    }
    if (method === "PUT") {
      game.receive(received);
    }
    return json_response(sv.to_string(game, true));
  }
  return not_found(request);
}

async function api_chat(method: HTTPMethod, path: string, request: Request) {
  const lobby = get_lobby(strip_prefix("/api/chat", path));
  if (lobby === null) {
    return not_found(request);
  }
  if (method === "GET") {
    return json_response(sv.to_string(lobby.chat));
  }
  if (method === "PUT") {
    const body = await request.json();
    const message = sv.to_class(body, new Message());
    if (message instanceof Error) {
      return not_found(request);
    }
    lobby.chat.add(message);
    return json_response(sv.to_string(lobby.chat));
  }
  return not_found(request);
}

export function handle_api(request: Request, path: string) {
  const method = http_method(request.method);
  if (path.startsWith("/api/lobbies/")) {
    return api_lobbies(method, path, request);
  }
  if (path.startsWith("/api/chat/")) {
    return api_chat(method, path, request);
  }
  return not_found(request);
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

export function api_get_lobby(lobby_id: string): Object | null {
  const lobby = get_lobby(lobby_id);
  if (lobby === null) {
    return null;
  }
  return sv.to_object(lobby);
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
