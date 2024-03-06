import { Lobby, Message } from "../libcommon/lobby.ts";
import { randint } from "../libcommon/utils.ts";
import * as sv from "../libcommon/schema.ts";

type HTTPMethod = "GET" | "PUT" | "UNKNOWN";

function http_method(s: string): HTTPMethod {
  if (["GET", "PUT"].includes(s)) {
    return <HTTPMethod> s;
  }
  return "UNKNOWN";
}

function stripPrefix(prefix: string, string: string) {
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
  lobbies[path] = new Lobby(path);
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

function api_lobbies(method: HTTPMethod, path: string, request: any): Response {
  if (method != "GET") {
    return not_found(request);
  }
  console.log("GET " + path);
  const lobby = get_lobby(stripPrefix("/api/lobbies", path));
  if (lobby === null) {
    console.log(" -> 404");
    return not_found(request);
  }
  console.log(" -> " + sv.to_string(lobby));
  return json_response(sv.to_string(lobby));
}

async function api_chat(method: HTTPMethod, path: string, request: Request) {
  const lobby = get_lobby(stripPrefix("/api/chat", path));
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
    console.log("PUT " + path + " " + JSON.stringify(body));
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
