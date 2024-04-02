import { Lobby, Message } from "../libcommon/lobby.ts";
import { randint } from "../libcommon/utils.ts";
import * as sv from "../libcommon/schema.ts";
import { User } from "../libcommon/user.ts";
import { WebSocketMessage } from "../libcommon/websocket.ts";
import { BaseGame } from "../libcommon/game.ts";
import { game_selector } from "../games/game_selector.ts";

class WebSocketConnection {
  ws: any;
  user: User | null;
  queue: string[];
  constructor(ws: any) {
    this.ws = ws;
    this.user = null;
    this.queue = [];
  }

  onopen() {
    return;
  }

  onclose() {
    return;
  }

  onmessage(m: MessageEvent) {
    console.log("<- Received: " + m.data);
    const message = sv.to_class(m.data, new WebSocketMessage());
    if (message instanceof Error) {
      console.log("Error, invalid web socket message received");
      return;
    }
    handle_ws_message(this, message);
  }

  attempt_send() {
    if (this.queue.length === 0) {
      return;
    }
    if (this.ws.readyState === 1) {
      const data = <string> this.queue.shift();
      this.ws.send(data);
      console.log("-> Sent: " + data);
      this.attempt_send();
      return;
    }
    setTimeout(function () {
      this.attempt_send();
    }, 100);
  }

  send(msg: WebSocketMessage) {
    this.queue.push(sv.to_string(msg));
    this.attempt_send();
  }
}

function ws_broadcast(_lobby: Lobby, message: WebSocketMessage) {
  for (const connection of clients) {
    connection.send(message);
  }
}

function handle_ws_message(
  connection: WebSocketConnection,
  data: WebSocketMessage,
) {
  const lobby_id = data.lobby_id;
  let lobby: Lobby | null = null;
  if (lobby_id !== "") {
    lobby = get_lobby(lobby_id);
    if (lobby === null) {
      return;
    }
  }
  const game_id = data.game_id;
  let game = null;
  if (game_id !== "") {
    if (lobby === null) {
      return;
    }
    game = lobby.find_game(game_id);
    if (game === null) {
      return;
    }
  }
  if (data.action === "login") {
    const user = sv.to_class(data.payload, new User());
    if (user instanceof Error) {
      console.log("Error: Could not convert user - " + data.payload);
      return;
    }
    if (lobby === null) {
      console.log("Error: Missing lobby for user - " + data.payload);
      return;
    }
    connection.user = user;
    ws_broadcast(lobby, data);
    return;
  }
  if (lobby === null) {
    console.log("Error: Missing lobby for chat message - " + data.payload);
    return;
  }
  if (connection.user === null) {
    console.log("Error: User not logged in - " + data.payload);
    return;
  }
  if (data.action === "chat") {
    const message = sv.to_class(data.payload, new Message());
    if (message instanceof Error) {
      console.log("Error: Could not convert message - " + data.payload);
      return;
    }
    if (message.user.userid !== connection.user.userid) {
      console.log("Error: Wrong userid");
      return;
    }
    lobby.chat.add(message);
    ws_broadcast(lobby, data);
  }
  return;
}

const lobbies: { [key: string]: Lobby } = {};
const clients: WebSocketConnection[] = [];

function get_lobby(lobby_id: string): Lobby | null {
  if (lobby_id in lobbies) {
    return lobbies[lobby_id];
  }
  return null;
}

function get_game(lobby_id: string, game_id: string) {
  const lobby = get_lobby(lobby_id);
  if (lobby === null) {
    return null;
  }
  return lobby.find_game(game_id);
}

export function create_lobby(): string {
  let lobby_id = "" + randint(10_000, 99_999);
  while (get_lobby(lobby_id) != null) {
    lobby_id = "" + randint(10_000, 99_999);
  }
  const lobby = new Lobby(lobby_id);
  lobby.chat.messages.push(
    new Message(new User("0", "System"), "New lobby created"),
  );
  lobby.chat.messages.push(
    new Message(
      new User("0", "System"),
      `New ${lobby.games[0].class_name()} game created`,
    ),
  );
  lobbies[lobby_id] = lobby;
  return lobby_id;
}

function game_from_request(body) {
  const cls: sv.Class<BaseGame> | null = game_selector(body);
  if (cls === null) {
    return null;
  }
  const game = sv.to_class(body, new cls());
  if (game instanceof Error) {
    console.log("Error in to class");
    return null;
  }
  return game;
}

export function api_put_new_game(lobby_id, body) {
  const lobby = get_lobby(lobby_id);
  if (lobby === null) {
    return null;
  }
  const game = game_from_request(body);
  if (game === null) {
    return null;
  }

  lobby.games.push(game);
  lobby.chat.messages.push(
    new Message(new User("0", "System"), `Created new ${game.name} game`),
  );
  return sv.to_object(lobby);
}

export function api_put_game(lobby_id, game_id, body) {
  const lobby = get_lobby(lobby_id);
  if (lobby === null) {
    return null;
  }
  const game = lobby.find_game(game_id);
  if (game === null) {
    return null;
  }
  const received = game_from_request(body);
  if (received === null) {
    return null;
  }
  game.receive(received);
  return sv.to_object(game);
}

export function api_delete_game(lobby_id, game_id) {
  const lobby = get_lobby(lobby_id);
  if (lobby === null) {
    return null;
  }
  console.log("Deleting game");
  lobby.games = lobby.games.filter((game) => game.id !== game_id);
  return sv.to_object(lobby);
}

export function api_get_game(lobby_id: string, game_id: string) {
  const game = get_game(lobby_id, game_id);
  if (game === null) {
    return null;
  }
  return sv.to_object(game);
}

export function api_get_lobby(lobby_id: string): object | null {
  const lobby = get_lobby(lobby_id);
  if (lobby === null) {
    return null;
  }
  return sv.to_object(lobby);
}

export function api_post_login(lobby_id: string, body: any) {
  const lobby = get_lobby(lobby_id);
  if (lobby === null) {
    console.log("Error: Could not find lobby - " + lobby_id);
    return null;
  }
  const user = sv.to_class(body, new User());
  if (user instanceof Error) {
    console.log("Error: Could not convert user - " + body);
    return null;
  }
  lobby.login(user);
  return sv.to_object(lobby.chat);
}

export function api_get_chat(lobby_id: string) {
  const lobby = get_lobby(lobby_id);
  if (lobby === null) {
    return null;
  }
  return sv.to_object(lobby.chat);
}

export function api_put_chat(lobby_id: string, body: any) {
  const lobby = get_lobby(lobby_id);
  if (lobby === null) {
    console.log("Error: Could not find lobby - " + lobby_id);
    return null;
  }
  const message = sv.to_class(body, new Message());
  if (message instanceof Error) {
    console.log("Error: Could not convert message - " + body);
    return null;
  }
  lobby.chat.add(message);
  return sv.to_object(lobby.chat);
}

export function api_ws(ctx) {
  const ws = ctx.upgrade();
  const client = new WebSocketConnection(ws);
  ws.onopen = () => {
    client.onopen();
  };
  ws.onmessage = (m) => {
    client.onmessage(m);
  };
  ws.onclose = () => {
    client.onclose();
  };
  clients.push(client);
}
