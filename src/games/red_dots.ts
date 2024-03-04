import {
  standard_canvas_height,
  standard_canvas_width,
  xy,
} from "../libcommon/utils.ts";
import type { XY } from "../libcommon/interfaces.ts";
import { Draw } from "../libdraw/draw.ts";

export class RedDots {
  id: string;
  name: string;
  width: number;
  height: number;
  dots: XY[];
  constructor(id: string) {
    this.id = id;
    this.name = "RedDots";
    this.width = standard_canvas_width();
    this.height = standard_canvas_height();
    this.dots = [];
  }

  mouse_click(x: number, y: number) {
    this.dots.push(xy(x, y));
  }

  draw(ctx: any) {
    for (const circle of this.dots) {
      Draw.circle(ctx, circle.x, circle.y, this.width / 100, "#FF0000");
    }
  }

  to_object() {
    return { id: this.id, dots: this.dots };
  }
}
