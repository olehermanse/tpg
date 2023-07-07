import { xy } from "../libbasic/utils";
import type { XY } from "../libbasic/interfaces";
import { Draw } from "../libdraw/draw";

class Game {
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

class Application {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  scale: number;
  canvas_width: number;
  canvas_height: number;
  real_canvas_width: number;
  real_canvas_height: number;
  mouse: XY;
  game: Game;

  constructor(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    canvas_width: number,
    canvas_height: number,
    scale: number
  ) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.scale = scale;
    this.canvas_width = canvas_width;
    this.canvas_height = canvas_height;
    this.real_canvas_width = Math.floor(this.scale * this.canvas_width);
    this.real_canvas_height = Math.floor(this.scale * this.canvas_height);
    canvas.width = this.real_canvas_width;
    canvas.height = this.real_canvas_height;
    this.mouse = xy(0, 0);
    this.game = new Game(canvas_width, canvas_height);
    this.setup_events(canvas);
  }

  offset_to_canvas(p: number, canvas: HTMLCanvasElement) {
    return (p / canvas.getBoundingClientRect().width) * this.canvas_width;
  }

  draw() {
    Draw.rectangle(
      this.ctx,
      0,
      0,
      this.canvas_width,
      this.canvas_height,
      "#000000"
    );
    this.game.draw(this.ctx);
  }

  mouse_click(x: number, y: number) {
    this.mouse = xy(x, y);
    this.game.mouse_click(this.mouse.x, this.mouse.y);
  }

  mouse_move(x: number, y: number) {
    this.mouse = xy(x, y);
  }

  mouse_release(x: number, y: number) {
    this.mouse = xy(x, y);
  }

  key_down(key: string) {}

  key_up(key: string) {}

  setup_events(canvas: HTMLCanvasElement) {
    canvas.addEventListener("mousedown", (e) => {
      const x = this.offset_to_canvas(e.offsetX, canvas);
      const y = this.offset_to_canvas(e.offsetY, canvas);
      this.mouse_click(x, y);
      this.mouse_move(x, y);
    });

    canvas.addEventListener("mousemove", (e) => {
      const x = this.offset_to_canvas(e.offsetX, canvas);
      const y = this.offset_to_canvas(e.offsetY, canvas);
      this.mouse_move(x, y);
    });

    window.addEventListener("mouseup", (e) => {
      const x = this.offset_to_canvas(e.offsetX, canvas);
      const y = this.offset_to_canvas(e.offsetY, canvas);
      this.mouse_release(x, y);
      this.mouse_move(x, y);
    });

    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key === " ") {
          // Prevent spacebar from scrolling page
          event.preventDefault();
        }
        this.key_down(event.key);
      },
      false
    );

    document.addEventListener(
      "keyup",
      (event) => {
        this.key_up(event.key);
      },
      false
    );
  }

  tick(ms) {
    this.draw();
  }
}

export { Application };
