import { Lobby, Message } from "../libcommon/lobby.ts";
import { randint } from "../libcommon/utils.ts";
import * as sv from "../libcommon/schema.ts";
import { User } from "../libcommon/user.ts";
import { TicTacToe } from "../games/tic_tac_toe.ts";
import { RedDots } from "../games/red_dots.ts";
import { BaseGame } from "../libcommon/game.ts";

type HTTPMethod = "GET" | "PUT" | "UNKNOWN";

function http_method(s: string): HTTPMethod {
  if (["GET", "PUT"].includes(s)) {
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

export function get_lobby(path: string): Lobby | null {
  if (path in lobbies) {
    return lobbies[path];
  }
  return null;
}

export function create_lobby(): string {
  let path = "/" + randint(10_000, 99_999);
  while (get_lobby(path) != null) {
    path = "/" + randint(10_000, 99_999);
  }
  const lobby = new Lobby(path);
  lobby.chat.messages.push(
    new Message(new User("0", "System"), "New lobby created"),
  );
  lobby.chat.messages.push(
    new Message(
      new User("0", "System"),
      `New ${lobby.games[0].class_name()} game created`,
    ),
  );
  lobbies[path] = lobby;
  return path;
}

export function not_found(_request: Request) {
  return new Response("404 Not Found", { status: 404 });
}

function json_response(json: string): Response {
  const headers: HeadersInit = { "content-type": "application/json" };
  const response = new Response(json, { headers: headers });
  return response;
}

async function game_from_request(request) {
  const body = await request.json();
  let cls: sv.Class<BaseGame> | null = null;
  if (body instanceof Object) {
    if (body.name === "RedDots") {
      cls = RedDots;
    } else if (body.name === "TicTacToe") {
      cls = TicTacToe;
    }
  }
  if (cls === null) {
    return null;
  }
  const game = sv.to_class(body, new cls());
  if (game instanceof Error) {
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
  const game = await game_from_request(request);
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
  if (!["GET", "PUT"].includes(method)) {
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
    if (method === "GET") {
      return json_response(sv.to_string(game, true));
    }
    const received = await game_from_request(request);
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
