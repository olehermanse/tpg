import { handle_api, not_found, create_lobby, get_lobby } from "./api.ts";
import { runtime_tests } from "../libcommon/lobby.ts";

const success = runtime_tests();
if (success === true) {
  console.log("Runtime tests succeeded");
} else {
  console.log("Error: Runtime tests failed");
  // @ts-ignore
  Deno.exit(1);
}

// Start listening on port 3000 of localhost.
// @ts-ignore
const server = Deno.listen({ port: 3000 });
console.log("Backend running on http://localhost:3000/");

for await (const conn of server) {
  handle_http(conn).catch(console.error);
}

function illegal_url(path: string) {
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

function get_content_type(path: string): string {
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

async function handle_file(request_event: any, filepath: string) {
  if (filepath === "/") {
    filepath = "/index.html";
  }

  const content_type: string = get_content_type(filepath);
  if (content_type === "") {
    await not_found(request_event);
    return;
  }

  // Try opening the file
  let file;
  try {
    // @ts-ignore
    file = await Deno.open(`./dist${filepath}`, { read: true });
  } catch {
    await not_found(request_event);
    return;
  }

  const readable_stream = file.readable;
  const headers: HeadersInit = { "content-type": content_type };
  const response = new Response(readable_stream, { headers: headers });
  await request_event.respondWith(response);
  return;
}

async function redirect(request_event: any, newpath: string) {
  const response = new Response("", {
    status: 302,
    headers: { Location: newpath },
  });
  await request_event.respondWith(response);
}

// @ts-ignore
async function handle_http(conn: Deno.Conn) {
  // @ts-ignore
  const http_connection = Deno.serveHttp(conn);
  for await (const request_event of http_connection) {
    const url = new URL(request_event.request.url);
    let filepath = decodeURIComponent(url.pathname);

    if (illegal_url(filepath)) {
      await not_found(request_event);
      continue;
    }
    if (filepath === "/" || filepath === "/index.html") {
      const path = create_lobby();
      await redirect(request_event, path);
      continue;
    }
    if (filepath.startsWith("/api/")) {
      await handle_api(request_event, filepath);
      continue;
    }

    if (/^\/[0-9]{5}$/.test(filepath)) {
      if (get_lobby(filepath)) {
        filepath = "/index.html";
      } else {
        await redirect(request_event, "/");
        continue;
      }
    }
    await handle_file(request_event, filepath);
  }
}
