import { BaseGame } from "../libcommon/game.ts";
import { Draw } from "../libdraw/draw.ts";
import { Schema } from "../libcommon/schema.ts";

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

export class RedDots extends BaseGame {
  dots: XY[];
  constructor() {
    super();
    this.dots = [];
  }

  class_name(): string {
    return "RedDots";
  }

  schema(): Schema {
    const schema = super.base_schema();
    schema["properties"]["dots"] = { type: XY, array: true };
    return schema;
  }

  mouse_click(x: number, y: number) {
    this.dots.push(new XY(x, y));
    this.schedule_sync();
  }

  receive(game: BaseGame) {
    console.assert(game.name === this.name);
    console.assert(game instanceof RedDots);
    if (!(game instanceof RedDots)) {
      return;
    }
    const source: RedDots = game;
    if (source.dots.length > this.dots.length) {
      this.dots = source.dots;
    }
  }

  draw(ctx: any) {
    for (const circle of this.dots) {
      Draw.circle(ctx, circle.x, circle.y, this.width / 100, "#FF0000");
    }
  }
}
