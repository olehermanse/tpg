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
  let filepath = decodeURIComponent(url.pathname);
  if (filepath.startsWith("/api/chat")) {
    return false;
  }
  return true;
}

async function log_response(
  request: Request,
  response: Response | Promise<Response>,
): Promise<Response> {
  if (should_log(request) === false) {
    return response;
  }
  const url = new URL(request.url);
  let filepath = decodeURIComponent(url.pathname);
  if (response instanceof Promise) {
    let body = filepath;
    const r = await response;
    const location = r.headers.get("Location");
    if (r.status === 302 && location != null) {
      body = location;
    } else if (filepath.startsWith("/api")) {
      body = await r.text();
    }
    console.log(`${request.method} ${filepath}`);
    console.log(` -> ${r.status} ${body}`);
    return response;
  }
  let body = filepath;
  const location = response.headers.get("Location");
  if (response.status === 302 && location != null) {
    body = location;
  } else if (filepath.startsWith("/api")) {
    body = await response.text();
    body = JSON.stringify(JSON.parse(body));
  }
  console.log(`${request.method} ${filepath}`);
  console.log(` -> ${response.status} ${body}`);
  return response;
}

// Start listening on port 3000 of localhost.
const handler = (request: Request): Response | Promise<Response> => {
  let response = _handle_request(request);
  response = log_response(request, response);
  return response;
};

const port = 3000;
console.log("Backend running on http://localhost:3000/");
Deno.serve({ port }, handler);
