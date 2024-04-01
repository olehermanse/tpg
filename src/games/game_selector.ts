import { BaseGame } from "../libcommon/game.ts";
import { Class } from "../libcommon/schema.ts";
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
