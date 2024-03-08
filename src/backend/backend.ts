import "./deno_types.ts";
import { create_lobby, get_lobby, handle_api, not_found } from "./api.ts";
import { runtime_tests } from "../libcommon/lobby.ts";

const success = runtime_tests();
if (success === true) {
  console.log("Runtime tests succeeded");
} else {
  console.log("Error: Runtime tests failed");
  Deno.exit(1);
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

async function handle_file(
  request: Request,
  filepath: string,
): Promise<Response> {
  if (filepath === "/") {
    filepath = "/index.html";
  }

  const content_type: string = get_content_type(filepath);
  if (content_type === "") {
    return not_found(request);
  }

  try {
    const headers: HeadersInit = { "content-type": content_type };
    const file = await Deno.readTextFile(`./dist${filepath}`);
    const response = new Response(file, { headers: headers });
    return response;
  } catch {
    return not_found(request);
  }
}

function redirect(newpath: string): Response {
  return new Response("", {
    status: 302,
    headers: { Location: newpath },
  });
}

function _handle_request(request: Request): Response | Promise<Response> {
  const url = new URL(request.url);
  let filepath = decodeURIComponent(url.pathname);
  if (illegal_url(filepath)) {
    return not_found(request);
  }
  if (filepath === "/" || filepath === "/index.html") {
    const path = create_lobby();
    return redirect(path);
  }
  if (filepath.startsWith("/api/")) {
    return handle_api(request, filepath);
  }

  if (/^\/[0-9]{5}$/.test(filepath)) {
    if (get_lobby(filepath)) {
      filepath = "/index.html";
    } else {
      return redirect("/");
    }
  }
  return handle_file(request, filepath);
}

function should_log(request: Request): boolean {
  if (request.method != "GET") {
    return true;
  }
  const url = new URL(request.url);
  const filepath = decodeURIComponent(url.pathname);
  if (filepath.startsWith("/api/chat")) {
    return false;
  }
  if (filepath.startsWith("/api/lobbies") && filepath.includes("/games/")) {
    return false;
  }
  return true;
}

async function log_response(
  request: Request,
  response: Response | Promise<Response>,
) {
  if (should_log(request) === false) {
    return;
  }
  if (response instanceof Promise) {
    const r = await response;
    log_response(request, r);
    return;
  }

  const url = new URL(request.url);
  const filepath = decodeURIComponent(url.pathname);
  const location = response.headers.get("Location");

  let body = filepath;
  if (response.status === 302 && location != null) {
    body = "redirect to " + location;
  } else if (filepath.startsWith("/api")) {
    body = await response.text();
    try {
      body = JSON.stringify(JSON.parse(body));
    } catch {}
  }
  console.log(`${request.method} ${filepath}`);
  console.log(` -> ${response.status} ${body}`);
}

// Start listening on port 3000 of localhost.
const handler = (request: Request): Response | Promise<Response> => {
  const response = _handle_request(request);
  log_response(request, response);
  return response;
};

const port = 3000;
console.log("Backend running on http://localhost:3000/");
Deno.serve({ port }, handler);
