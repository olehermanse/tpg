import { Lobby, Message } from "../libcommon/lobby.ts";
import { randint } from "../libcommon/utils.ts";

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

export async function notFound(requestEvent: RequestEvent) {
  const notFoundResponse = new Response("404 Not Found", { status: 404 });
  await requestEvent.respondWith(notFoundResponse);
}

function JSONResponse(json: string): Response {
  const headers: HeadersInit = { "content-type": "application/json" };
  const response = new Response(json, { headers: headers });
  return response;
}

export async function handleAPI(requestEvent: RequestEvent, path: string) {
  if (path.startsWith("/api/lobbies/")) {
    console.log("GET " + path);
    let lobby = get_lobby(stripPrefix("/api/lobbies", path));
    if (lobby === null) {
      await notFound(requestEvent);
      console.log(" -> 404");
      return;
    }
    await requestEvent.respondWith(JSONResponse(lobby.json));
    console.log(" -> " + lobby.json);
    return;
  }
  if (path.startsWith("/api/chat/")) {
    let lobby = get_lobby(stripPrefix("/api/chat", path));
    if (lobby === null) {
      await notFound(requestEvent);
      return;
    }
    if (requestEvent.request.method === "PUT") {
      const r = await requestEvent.request.json();
      console.log("PUT " + path + " " + JSON.stringify(r));
      const message: Message | null = Message.from(r);
      if (message === null) {
        await notFound(requestEvent);
        console.log(" -> 404");
        return;
      }
      lobby.chat.messages.push(message);
      console.log(" -> " + lobby.chat.json);
    }
    await requestEvent.respondWith(JSONResponse(lobby.chat.json));
    return;
  }
  await notFound(requestEvent);
}
