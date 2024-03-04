import { Lobby, Message } from "../libcommon/lobby.ts";
import { randint } from "../libcommon/utils.ts";
import * as sv from "../libcommon/schema.ts";

type HTTPMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "OPTIONS"
  | "HEAD"
  | "CONNECT"
  | "TRACE";

function stripPrefix(prefix: string, string: string) {
  if (!string.startsWith(prefix)) {
    return string;
  }
  return string.slice(prefix.length);
}

let lobbies: { [key: string]: Lobby } = {};

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

export async function not_found(request_event: any) {
  const response = new Response("404 Not Found", { status: 404 });
  await request_event.respondWith(response);
}

function json_response(json: string): Response {
  const headers: HeadersInit = { "content-type": "application/json" };
  const response = new Response(json, { headers: headers });
  return response;
}

async function api_lobbies(
  method: HTTPMethod,
  path: string,
  request_event: any,
) {
  if (method != "GET") {
    await not_found(request_event);
    return;
  }
  console.log("GET " + path);
  let lobby = get_lobby(stripPrefix("/api/lobbies", path));
  if (lobby === null) {
    await not_found(request_event);
    console.log(" -> 404");
    return;
  }
  await request_event.respondWith(json_response(sv.to_string(lobby)));
  console.log(" -> " + sv.to_string(lobby));
}

async function api_chat(method: HTTPMethod, path: string, request_event: any) {
  if (!["GET", "PUT"].includes(method)) {
    await not_found(request_event);
    return;
  }
  let lobby = get_lobby(stripPrefix("/api/chat", path));
  if (lobby === null) {
    await not_found(request_event);
    return;
  }
  if (method === "PUT") {
    const body = await request_event.request.json();
    console.log("PUT " + path + " " + JSON.stringify(body));
    const message = sv.to_class(body, new Message());
    if (message instanceof Error) {
      await not_found(request_event);
      console.log(` -> 404 (${message.message})`);
      return;
    }
    lobby.chat.messages.push(message);
    console.log(" -> " + sv.to_string(lobby.chat));
  }
  await request_event.respondWith(json_response(sv.to_string(lobby.chat)));
}

export async function handle_api(request_event: any, path: string) {
  const method = request_event.request.method;
  if (path.startsWith("/api/lobbies/")) {
    api_lobbies(method, path, request_event);
    return;
  }
  if (path.startsWith("/api/chat/")) {
    api_chat(method, path, request_event);
    return;
  }
  await not_found(request_event);
}
