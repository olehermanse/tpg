import { User } from "./user.ts";
import { SchemaClass } from "./schema.ts";

export interface Game extends SchemaClass {
  id: string;
  name: string;
  players: User[];
}

export interface FrontendGame extends Game {
  width: number;
  height: number;
  draw(ctx: any): void;
  mouse_click(x: number, y: number): void;
}
