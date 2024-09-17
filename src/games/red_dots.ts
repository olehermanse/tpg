import { BaseGame } from "../libcommon/game.ts";
import { Draw } from "@olehermanse/utils/draw.js";
import * as sv from "@olehermanse/utils/schema.js";
import { User } from "../libcommon/user.ts";

class XY {
  x: number;
  y: number;
  constructor(x?: number, y?: number) {
    this.x = x ?? 0;
    this.y = y ?? 0;
  }
  schema(): sv.Schema {
    return {
      properties: {
        x: { type: "number" },
        y: { type: "number" },
      },
    };
  }
}

function equal_dots(a: XY[], b: XY[]): boolean {
  if (a.length != b.length) {
    return false;
  }
  const n = a.length;
  for (let i = n - 1; i >= 0; i--) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

function merge_dots(a: XY[], b: XY[]): XY[] {
  if (equal_dots(a, b)) {
    return a;
  }
  const all = [...a, ...b];
  const strings = all.map((d) => {
    return sv.to_string(d);
  });
  const unique_strings = [...new Set(strings)];
  const dots = unique_strings.map((d) => {
    return sv.to_class(d, new XY());
  });
  return <XY[]> dots;
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

  schema(): sv.Schema {
    const schema = super.base_schema();
    schema["properties"]["dots"] = { type: XY, array: true };
    return schema;
  }

  mouse_click(x: number, y: number, _user: User) {
    this.dots.push(new XY(x, y));
    this.schedule_sync();
  }

  on_receive(game: BaseGame) {
    console.assert(game.name === this.name);
    console.assert(game instanceof RedDots);
    if (!(game instanceof RedDots)) {
      return;
    }
    const source: RedDots = game;
    this.dots = merge_dots(this.dots, source.dots);
  }

  draw(ctx: any) {
    for (const circle of this.dots) {
      Draw.circle(ctx, circle.x, circle.y, this.width / 100, "#FF0000");
    }
  }
}
