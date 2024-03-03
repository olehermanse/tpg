import { Lobby, Message } from "../libcommon/lobby.ts";
import { randint } from "../libcommon/utils.ts";
import * as sv from "../libcommon/schema.ts";

interface Request {
  method: string;
  json(): { [key: string]: any };
  url: string;
}

export interface RequestEvent {
  respondWith(response: any): any;
  request: Request;
}

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

export async function not_found(request_event: RequestEvent) {
  const response = new Response("404 Not Found", { status: 404 });
  await request_event.respondWith(response);
}

function json_response(json: string): Response {
  const headers: HeadersInit = { "content-type": "application/json" };
  const response = new Response(json, { headers: headers });
  return response;
}

export async function handle_api(request_event: RequestEvent, path: string) {
  if (path.startsWith("/api/lobbies/")) {
    console.log("GET " + path);
    let lobby = get_lobby(stripPrefix("/api/lobbies", path));
    if (lobby === null) {
      await not_found(request_event);
      console.log(" -> 404");
      return;
    }
    await request_event.respondWith(json_response(sv.stringify(lobby)));
    console.log(" -> " + sv.stringify(lobby));
    return;
  }
  if (path.startsWith("/api/chat/")) {
    let lobby = get_lobby(stripPrefix("/api/chat", path));
    if (lobby === null) {
      await not_found(request_event);
      return;
    }
    if (request_event.request.method === "PUT") {
      const r = await request_event.request.json();
      console.log("PUT " + path + " " + JSON.stringify(r));
      const message: Message | Error = sv.convert(
        JSON.stringify(r),
        new Message()
      );
      if (message instanceof Error) {
        await not_found(request_event);
        console.log(" -> 404");
        return;
      }
      lobby.chat.messages.push(message);
      console.log(" -> " + sv.stringify(lobby.chat));
    }
    await request_event.respondWith(json_response(sv.stringify(lobby.chat)));
    return;
  }
  await not_found(request_event);
}
