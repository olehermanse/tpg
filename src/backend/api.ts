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

async function put_lobbies(path: string, request: any) {
  const body = await request.json();
  console.log("PUT game " + path + " " + JSON.stringify(body));
  if (!path.endsWith("/games")) {
    console.log("-> 404 Path does not end in /games");
    return not_found(request);
  }
  const lobby_id = strip_both("/api/lobbies", path, "/games");
  const lobby = get_lobby(lobby_id);
  if (lobby === null) {
    console.log("-> 404 Lobby not found: " + lobby_id);
    return not_found(request);
  }
  let cls: sv.Class<BaseGame> | null = null;
  if (body instanceof Object) {
    if (body.name === "RedDots") {
      cls = RedDots;
    } else if (body.name === "TicTacToe") {
      cls = TicTacToe;
    }
  }
  if (cls === null) {
    console.log("-> 404 Class not found " + lobby_id);
    return not_found(request);
  }
  const game = sv.to_class(body, new cls());
  if (game instanceof Error) {
    console.log(` -> 404 (${game.message})`);
    return not_found(request);
  }
  lobby.games.push(game);
  lobby.chat.messages.push(
    new Message(new User("0", "System"), `Created new ${game.name} game`),
  );
  console.log(" -> " + sv.to_string(lobby));
  return json_response(sv.to_string(lobby));
}

function api_lobbies(method: HTTPMethod, path: string, request: any): Response {
  if (method === "PUT") {
    return put_lobbies(path, request);
  }
  if (method != "GET") {
    return not_found(request);
  }
  console.log("GET " + path);
  const lobby = get_lobby(strip_prefix("/api/lobbies", path));
  if (lobby === null) {
    console.log(" -> 404");
    return not_found(request);
  }
  console.log(" -> " + sv.to_string(lobby));
  return json_response(sv.to_string(lobby, true));
}

async function api_chat(method: HTTPMethod, path: string, request: Request) {
  const lobby = get_lobby(strip_prefix("/api/chat", path));
  if (lobby === null) {
    return not_found(request);
  }
  if (method === "GET") {
    // console.log("GET " + path);
    // console.log(" -> " + sv.to_string(lobby.chat));
    return json_response(sv.to_string(lobby.chat));
  }
  if (method === "PUT") {
    const body = await request.json();
    console.log("PUT chat " + path + " " + JSON.stringify(body));
    const message = sv.to_class(body, new Message());
    if (message instanceof Error) {
      console.log(` -> 404 (${message.message})`);
      return not_found(request);
    }
    lobby.chat.add(message);
    console.log(" -> " + sv.to_string(lobby.chat));
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
