import { describe, expect, test } from "vitest";
import { RedDots } from "../src/games/red_dots.ts";

describe("RedDots", () => {
  test("constructor", () => {
    let game = new RedDots();
    expect(game).not.toBe(null);
  });
});
