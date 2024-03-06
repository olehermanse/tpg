import { User } from "./user.ts";
import { Schema, SchemaClass } from "./schema.ts";
import {
  get_random_userid,
  standard_canvas_height,
  standard_canvas_width,
} from "./utils.ts";

export abstract class BaseGame extends SchemaClass {
  id: string;
  name: string;
  players: User[];

  width: number;
  height: number;

  abstract draw(ctx: any): void;
  abstract mouse_click(x: number, y: number): void;
  abstract class_name(): string;

  constructor(id?: string) {
    super();
    this.name = this.class_name();
    this.id = id ?? get_random_userid();
    this.players = [];
    this.width = standard_canvas_width();
    this.height = standard_canvas_height();
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
}
