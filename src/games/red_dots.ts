import {
  xy,
  standard_canvas_width,
  standard_canvas_height,
} from "../libcommon/utils.ts";
import type { XY } from "../libcommon/interfaces.ts";
import { Draw } from "../libdraw/draw.ts";

class RedDots {
  id: string;
  name: string;
  width: number;
  height: number;
  dots: XY[];
  constructor(id) {
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
    for (let circle of this.dots) {
      Draw.circle(ctx, circle.x, circle.y, this.width / 100, "#FF0000");
    }
  }

  get object() {
    return { id: this.id, dots: this.dots };
  }
}

export { RedDots };
