import {
  get_random_userid,
  standard_canvas_height,
  standard_canvas_width,
} from "../libcommon/utils.ts";
import { FrontendGame } from "../libcommon/game.ts";
import { Draw } from "../libdraw/draw.ts";
import { Schema } from "../libcommon/schema.ts";
import { User } from "../libcommon/user.ts";

class XY {
  x: number;
  y: number;
  constructor(x?: number, y?: number) {
    this.x = x ?? 0;
    this.y = y ?? 0;
  }
  schema(): Schema {
    return {
      properties: {
        x: { type: "number" },
        y: { type: "number" },
      },
    };
  }
}

export class RedDots implements FrontendGame {
  id: string;
  name: string;
  width: number;
  height: number;
  dots: XY[];
  players: User[];
  constructor(id?: string) {
    this.id = id ?? get_random_userid();
    this.name = "RedDots";
    this.width = standard_canvas_width();
    this.height = standard_canvas_height();
    this.dots = [];
    this.players = [];
  }

  schema(): Schema {
    return {
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        width: { type: "number" },
        height: { type: "number" },
        dots: { type: XY, array: true },
      },
    };
  }

  mouse_click(x: number, y: number) {
    this.dots.push(new XY(x, y));
  }

  draw(ctx: any) {
    for (const circle of this.dots) {
      Draw.circle(ctx, circle.x, circle.y, this.width / 100, "#FF0000");
    }
  }
}
