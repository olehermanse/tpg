import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import "./deno_types.ts";
import {
  api_lobby_exists,
  api_post_auth,
  api_ws,
  check_request_auth_headers,
  create_lobby,
} from "./api.ts";

function should_log(request: Request): boolean {
  if (request.method != "GET") {
    return true;
  }
  const url = new URL(request.url);
  const filepath = decodeURIComponent(url.pathname);
  if (filepath.startsWith("/api/ws")) {
    return false;
  }
  if (filepath.startsWith("/api/chat")) {
    return false;
  }
  if (filepath.startsWith("/api/lobbies")) {
    return false;
  }
  return true;
}

function log_response(ctx) {
  const request = ctx.request;
  const response = ctx.response;
  if (should_log(request) === false) {
    return;
  }

  const url = new URL(request.url);
  const filepath = decodeURIComponent(url.pathname);
  const location = response.headers.get("Location");

  let body: any = filepath;
  if (response.status === 302 && location != null) {
    body = "redirect to " + location;
  } else if (filepath.startsWith("/api")) {
    body = response.body;
    if (body instanceof Object) {
      try {
        body = JSON.stringify(body);
      } catch {
        // Could not stringify, default to body
      }
    } else {
      try {
        body = JSON.stringify(JSON.parse(body));
      } catch {
        // Could not parse, default to body
      }
    }
  }
  console.log(`${request.method} ${filepath}`);
  console.log(` -> ${response.status} ${body}`);
}

async function run_backend() {
  const router = new Router();
  router
    .get("/", (ctx, next) => {
      ctx.response.redirect(create_lobby());
      return next();
    })
    .get("/:lobby_id(\\d{5})", async (ctx, next) => {
      if (!api_lobby_exists(ctx.params.lobby_id)) {
        ctx.response.redirect(create_lobby());
        return next();
      }
      await ctx.send({
        root: `${Deno.cwd()}/dist`,
        path: "index.html",
      });
      return next();
    })
    .post("/api/auth/:lobby_id(\\d{5})", (ctx, next) => {
      api_post_auth(ctx);
      return next();
    })
    .get("/api/ws/:lobby_id(\\d{5})", (ctx, next) => {
      if (!ctx.isUpgradable) {
        ctx.throw(501);
      }
      api_ws(ctx, ctx.params.lobby_id);
      return next();
    });
  const app = new Application();
  app.use(async (ctx, next) => {
    const pathname = ctx.request.url.pathname;
    if (pathname.startsWith("/api") && !pathname.startsWith("/api/auth/")) {
      if (!check_request_auth_headers(ctx)) {
        console.log("check auth failed");
        ctx.throw(404);
      }
    }
    return await next();
  });
  app.use(async (ctx, next) => {
    await next();
    log_response(ctx);
  });

  app.use(router.routes());
  app.use(router.allowedMethods());
  app.use(async (ctx, next) => {
    const pathname = ctx.request.url.pathname;
    if (pathname.startsWith("/api")) {
      return await next();
    }
    if (!(pathname === "/favicon.ico" || pathname.startsWith("/assets"))) {
      return await next();
    }
    try {
      await ctx.send({
        root: `${Deno.cwd()}/dist`,
      });
    } catch {
      await next();
    }
  });

  console.log("Backend running on http://localhost:3000/");
  await app.listen({ port: 3000 });
}

await run_backend();
