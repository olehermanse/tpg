import { User } from "./user.ts";
import * as sv from "@olehermanse/utils/schema.js";
import {
  get_random_userid,
  standard_canvas_height,
  standard_canvas_width,
} from "@olehermanse/utils/funcs.js";

export abstract class BaseGameMove extends sv.SchemaClass {
  constructor(public user?: User) {
    super();
  }

  schema(): sv.Schema {
    return {
      properties: {
        user: { type: User },
      },
    };
  }
}

export abstract class BaseGame extends sv.SchemaClass {
  id: string;
  name: string;
  players: User[];
  moves: BaseGameMove[];

  width: number;
  height: number;
  needs_sync: boolean;
  browser_player: User | null = null;
  move_queue: sv.SchemaClass[] = [];

  abstract draw(ctx: any): void;
  abstract class_name(): string;
  abstract mouse_click(x: number, y: number, user: User): void;
  abstract on_receive(game: BaseGame): void;

  constructor(id?: string) {
    super();
    this.name = this.class_name();
    this.id = id ?? get_random_userid();
    this.players = [];
    this.moves = [];
    this.width = standard_canvas_width();
    this.height = standard_canvas_height();
    this.needs_sync = false;
  }

  max_players() {
    return 2;
  }

  add_player(user: User) {
    if (this.has_player(user.userid)) {
      return;
    }
    this.players.push(user);
  }

  has_player(userid: string): boolean {
    for (const u of this.players) {
      if (u.userid === userid) {
        return true;
      }
    }
    return false;
  }

  last_player(): string {
    if (this.moves.length === 0) {
      return "";
    }
    const move = this.moves[this.moves.length - 1];
    if (move.user === undefined) {
      return "";
    }
    return move.user.userid;
  }

  create_move(_payload: string): BaseGameMove | Error {
    return Error("Mising implementation for create_move()");
  }

  on_receive_move(_payload: BaseGameMove, _user?: User): boolean {
    return false;
  }

  receive_move(payload: string | BaseGameMove, user?: User): boolean {
    if (typeof payload === "string") {
      console.log("Converting string payload");
      console.log(payload);
      const move = this.create_move(payload);
      if (move instanceof Error) {
        return false;
      }
      const result = this.on_receive_move(move, user);
      return result;
    }
    if (payload.user === undefined) {
      return false;
    }
    // Move object (class)
    console.log("Receiving non-string payload");
    const result = this.on_receive_move(payload, user);
    console.log("Receiving non-string payload - on_receive_move done");
    return result;
  }

  send_move(move: BaseGameMove) {
    this.move_queue.push(move);
  }

  submit_move(move: BaseGameMove, user: User) {
    console.log("Submitting move:");
    console.log(sv.to_string(move, true));
    if (this.receive_move(move, user)) {
      console.log("Sending move:");
      console.log(sv.to_string(move, true));
      this.send_move(move);
    } else {
      console.log("receive_move failed");
    }
  }

  receive(game: BaseGame) {
    this.players = game.players;
    this.on_receive(game);
  }

  base_schema(): sv.Schema {
    return {
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        players: { type: User, array: true },
      },
    };
  }

  schedule_sync() {
    this.needs_sync = true;
  }
}
