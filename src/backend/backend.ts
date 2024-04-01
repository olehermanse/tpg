import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import "./deno_types.ts";
import {
  api_delete_game,
  api_get_chat,
  api_get_game,
  api_get_lobby,
  api_post_login,
  api_put_chat,
  api_put_game,
  api_put_new_game,
  create_lobby,
} from "./api.ts";
import { runtime_tests } from "../libcommon/lobby.ts";

function should_log(request: Request): boolean {
  if (request.method != "GET") {
    return true;
  }
  const url = new URL(request.url);
  const filepath = decodeURIComponent(url.pathname);
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
  const success = runtime_tests();
  if (success === true) {
    console.log("Runtime tests succeeded");
  } else {
    console.log("Error: Runtime tests failed");
    Deno.exit(1);
  }

  const router = new Router();
  router
    .get("/", (ctx, next) => {
      ctx.response.redirect(create_lobby());
      return next();
    })
    .get("/:lobby_id(\\d{5})", async (ctx, next) => {
      const lobby_id = ctx.params.lobby_id;
      const lobby = api_get_lobby(lobby_id);
      if (lobby === null) {
        ctx.response.redirect(create_lobby());
        return next();
      }
      await ctx.send({
        root: `${Deno.cwd()}/dist`,
        path: "index.html",
      });
      return next();
    })
    .post("/api/login/:lobby_id(\\d{5})", async (ctx, next) => {
      ctx.response.body = api_post_login(
        ctx.params.lobby_id,
        await ctx.request.body.json(),
      );
      return next();
    })
    .get("/api/chat/:lobby_id(\\d{5})", (ctx, next) => {
      ctx.response.body = api_get_chat(ctx.params.lobby_id);
      return next();
    })
    .put("/api/chat/:lobby_id(\\d{5})", async (ctx, next) => {
      ctx.response.body = api_put_chat(
        ctx.params.lobby_id,
        await ctx.request.body.json(),
      );
      return next();
    })
    .get("/api/lobbies/:lobby_id(\\d{5})", (ctx, next) => {
      ctx.response.body = api_get_lobby(ctx.params.lobby_id);
      return next();
    })
    .get(
      "/api/lobbies/:lobby_id(\\d{5})/games/:game_id(\\d{14})",
      (ctx, next) => {
        ctx.response.body = api_get_game(
          ctx.params.lobby_id,
          ctx.params.game_id,
        );
        return next();
      },
    )
    .put(
      "/api/lobbies/:lobby_id(\\d{5})/games/:game_id(\\d{14})",
      async (ctx, next) => {
        ctx.response.body = api_put_game(
          ctx.params.lobby_id,
          ctx.params.game_id,
          await ctx.request.body.json(),
        );
        return next();
      },
    )
    .put("/api/lobbies/:lobby_id(\\d{5})/games", async (ctx, next) => {
      ctx.response.body = api_put_new_game(
        ctx.params.lobby_id,
        await ctx.request.body.json(),
      );
      return next();
    })
    .delete(
      "/api/lobbies/:lobby_id(\\d{5})/games/:game_id(\\d{14})",
      (ctx, next) => {
        ctx.response.body = api_delete_game(
          ctx.params.lobby_id,
          ctx.params.game_id,
        );
        return next();
      },
    );
  const app = new Application();
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
