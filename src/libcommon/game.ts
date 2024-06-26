import { User } from "./user.ts";
import { Schema, SchemaClass } from "@olehermanse/utils/schema.js";
import {
  get_random_userid,
  standard_canvas_height,
  standard_canvas_width,
} from "@olehermanse/utils/funcs.js";

export abstract class BaseGame extends SchemaClass {
  id: string;
  name: string;
  players: User[];

  width: number;
  height: number;
  needs_sync: boolean;

  abstract draw(ctx: any): void;
  abstract class_name(): string;
  abstract mouse_click(x: number, y: number): void;
  abstract on_receive(game: BaseGame): void;

  constructor(id?: string) {
    super();
    this.name = this.class_name();
    this.id = id ?? get_random_userid();
    this.players = [];
    this.width = standard_canvas_width();
    this.height = standard_canvas_height();
    this.needs_sync = false;
  }

  receive(game: BaseGame) {
    this.players = game.players;
    this.on_receive(game);
  }

  base_schema(): Schema {
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
