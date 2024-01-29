import {
  handleAPI,
  notFound,
  RequestEvent,
  create_lobby,
  get_lobby,
} from "./api.ts";

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
      const path = create_lobby();
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
