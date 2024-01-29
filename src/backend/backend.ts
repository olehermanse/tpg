import { randint } from "../libcommon/utils.ts";
import { Lobby, Message } from "../libcommon/lobby.ts";

interface Request {
  method: string;
  json(): { [key: string]: any };
  url: string;
}

interface RequestEvent {
  respondWith(response: any): any;
  request: Request;
}

let lobbies: { [key: string]: Lobby } = {};

function get_lobby(path: string): Lobby | null {
  if (path in lobbies) {
    return lobbies[path];
  }
  return null;
}

// Start listening on port 3000 of localhost.
// @ts-ignore
const server = Deno.listen({ port: 3000 });
console.log("Backend running on http://localhost:3000/");

for await (const conn of server) {
  handleHttp(conn).catch(console.error);
}

function illegalURL(path: string) {
  return (
    !path.startsWith("/") ||
    path.includes("..") ||
    path.includes("//") ||
    path.includes(" ") ||
    path.includes(";") ||
    path.includes(",") ||
    path.includes("'") ||
    path.includes('"') ||
    path.includes("*")
  );
}

function getContentType(path: string): string {
  if (path === "/index.html") {
    return "text/html";
  }
  if (path === "/favicon.ico") {
    return "image/x-icon";
  }
  if (path.endsWith(".js")) {
    return "application/javascript";
  }
  if (path.endsWith(".css")) {
    return "text/css";
  }
  return "";
}

async function notFound(requestEvent: RequestEvent) {
  const notFoundResponse = new Response("404 Not Found", { status: 404 });
  await requestEvent.respondWith(notFoundResponse);
}

function stripPrefix(prefix: string, string: string) {
  if (!string.startsWith(prefix)) {
    return string;
  }
  return string.slice(prefix.length);
}

function JSONResponse(json: string): Response {
  const headers: HeadersInit = { "content-type": "application/json" };
  const response = new Response(json, { headers: headers });
  return response;
}

async function handleAPI(requestEvent: RequestEvent, path: string) {
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

async function handleFile(requestEvent: RequestEvent, filepath: string) {
  if (filepath === "/") {
    filepath = "/index.html";
  }

  const contentType: string = getContentType(filepath);
  if (contentType === "") {
    await notFound(requestEvent);
    return;
  }

  // Try opening the file
  let file;
  try {
    // @ts-ignore
    file = await Deno.open(`./dist${filepath}`, { read: true });
  } catch {
    await notFound(requestEvent);
    return;
  }

  const readableStream = file.readable;
  const headers: HeadersInit = { "content-type": contentType };
  const response = new Response(readableStream, { headers: headers });
  await requestEvent.respondWith(response);
  return;
}

async function redirect(requestEvent: RequestEvent, newpath: string) {
  const response = new Response("", {
    status: 302,
    headers: { Location: newpath },
  });
  await requestEvent.respondWith(response);
}

// @ts-ignore
async function handleHttp(conn: Deno.Conn) {
  // @ts-ignore
  const httpConn = Deno.serveHttp(conn);
  for await (const requestEvent of httpConn) {
    const url = new URL(requestEvent.request.url);
    let filepath = decodeURIComponent(url.pathname);

    if (illegalURL(filepath)) {
      await notFound(requestEvent);
      continue;
    }
    if (filepath === "/" || filepath === "/index.html") {
      let path = "/" + randint(10_000, 99_999);
      while (get_lobby(path) != null) {
        path = "/" + randint(10_000, 99_999);
      }
      lobbies[path] = new Lobby(path);
      await redirect(requestEvent, path);
      continue;
    }
    if (filepath.startsWith("/api/")) {
      await handleAPI(requestEvent, filepath);
      continue;
    }

    if (/^\/[0-9]{5}$/.test(filepath)) {
      if (get_lobby(filepath)) {
        filepath = "/index.html";
      } else {
        await redirect(requestEvent, "/");
        continue;
      }
    }
    await handleFile(requestEvent, filepath);
  }
}
