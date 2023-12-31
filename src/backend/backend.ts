import { RedDots } from "../games/red_dots.ts";
import { randint } from "../libbasic/utils.ts";

class Lobby {
  path: string;
  games: any[];
  chat_log: string[];
  constructor(path) {
    this.path = path;
    this.games = [];
    this.games.push(new RedDots("foo"));
  }

  get object() {
    let games = [];
    for (let game of this.games) {
      games.push(game.object);
    }
    return {
      chat: this.chat_log,
      games: games,
    };
  }

  get json() {
    return JSON.stringify(this.object);
  }
}

let lobbies = {};

function get_lobby(path: string) {
  if (path in lobbies) {
    return lobbies[path];
  }
  return null;
}

// Start listening on port 3000 of localhost.
const server = Deno.listen({ port: 3000 });
console.log("Backend running on http://localhost:3000/");

for await (const conn of server) {
  handleHttp(conn).catch(console.error);
}

function illegalURL(path) {
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

async function notFound(requestEvent) {
  const notFoundResponse = new Response("404 Not Found", { status: 404 });
  await requestEvent.respondWith(notFoundResponse);
}

function stripPrefix(prefix, string) {
  if (!string.startsWith(prefix)) {
    return string;
  }
  return string.slice(prefix.length);
}

function JSONResponse(json) {
  const headers: HeadersInit = { "content-type": "application/json" };
  const response = new Response(json, { headers: headers });
  return response;
}

async function handleAPI(requestEvent, path) {
  if (path.startsWith("/api/lobbies/")) {
    let lobby = get_lobby(stripPrefix("/api/lobbies", path));
    if (lobby != null) {
      await requestEvent.respondWith(JSONResponse(lobby.json));
      return;
    }
  }
  await notFound(requestEvent);
}

async function handleFile(requestEvent, filepath) {
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

async function redirect(requestEvent, newpath) {
  const response = new Response("", {
    status: 302,
    headers: { Location: newpath },
  });
  await requestEvent.respondWith(response);
}

async function handleHttp(conn: Deno.Conn) {
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

    if (/^\/[0-9]{5}$/.test(filepath) && get_lobby(filepath)) {
      filepath = "/index.html";
    }
    await handleFile(requestEvent, filepath);
  }
}
