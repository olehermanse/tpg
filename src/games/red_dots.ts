import { xy } from "../libbasic/utils";
import type { XY } from "../libbasic/interfaces";
import { Draw } from "../libdraw/draw";

class RedDots {
  dots: XY[];
  width: number;
  height: number;
  constructor(width, height) {
    this.dots = [];
    this.width = width;
    this.height = height;
  }

  mouse_click(x, y) {
    this.dots.push(xy(x, y));
  }

  draw(ctx) {
    for (let circle of this.dots) {
      Draw.circle(ctx, circle.x, circle.y, this.width / 100, "#FF0000");
    }
  }
}

export { RedDots };
