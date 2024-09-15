import { BaseGame } from "../libcommon/game.ts";
import { Class, to_class } from "@olehermanse/utils/schema.js";
import { Fives } from "./fives.ts";
import { NTacToe } from "./ntactoe.ts";
import { RedDots } from "./red_dots.ts";
import { TicTacToe } from "./tic_tac_toe.ts";
import { Twelves } from "./twelves.ts";

export function game_selector(data: any): Class<BaseGame> | null {
  if (data.name === "RedDots") {
    return RedDots;
  }
  if (data.name === "NTacToe") {
    return NTacToe;
  }
  if (data.name === "TicTacToe") {
    return TicTacToe;
  }
  if (data.name === "Fives") {
    return Fives;
  }
  if (data.name === "Twelves") {
    return Twelves;
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
  const result = to_class(data, new cls());
  if (result instanceof Error) {
    return null;
  }
  return result;
}
