import { Lobby, Message } from "../libcommon/lobby.ts";
import { randint } from "../libcommon/utils.ts";
import * as sv from "../libcommon/schema.ts";
import { User } from "../libcommon/user.ts";
import { TicTacToe } from "../games/tic_tac_toe.ts";
import { RedDots } from "../games/red_dots.ts";
import { BaseGame } from "../libcommon/game.ts";
import { Fives } from "../games/fives.ts";
import { Twelves } from "../games/twelves.ts";

const lobbies: { [key: string]: Lobby } = {};

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
  let cls: sv.Class<BaseGame> | null = null;
  if (body instanceof Object) {
    console.log("Object");
    if (body.name === "RedDots") {
      console.log("RedDots");
      cls = RedDots;
    } else if (body.name === "TicTacToe") {
      console.log("TicTacToe");
      cls = TicTacToe;
    } else if (body.name === "Fives") {
      console.log("Fives");
      cls = Fives;
    } else if (body.name === "Twelves") {
      console.log("Twelves");
      cls = Twelves;
    }
  }
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
