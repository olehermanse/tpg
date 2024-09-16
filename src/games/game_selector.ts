import { BaseGame } from "../libcommon/game.ts";
import * as sv from "@olehermanse/utils/schema.js";
import { NTacToe } from "./ntactoe.ts";
import { RedDots } from "./red_dots.ts";

export function game_selector(data: any): sv.Class<BaseGame> | null {
  if (data.name === "RedDots") {
    return RedDots;
  }
  if (data.name === "NTacToe") {
    return NTacToe;
  }
  return null;
}

export function game_selector_new(input: string): BaseGame | null {
  const data = JSON.parse(input);
  if (data === undefined) {
    console.log("Undefined data");
    return null;
  }
  const cls = game_selector(data);
  if (cls === null) {
    return null;
  }
  const result = sv.to_class(data, new cls());
  if (result instanceof Error) {
    return null;
  }
  return result;
}
