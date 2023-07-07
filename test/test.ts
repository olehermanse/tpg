import { expect, test, describe } from "vitest";
import { RedDots } from "../src/games/red_dots";

describe("RedDots game", () => {
  test("can be created with width and height", () => {
    let game = new RedDots(2000, 1000);
    expect(game.width).toBe(2000);
    expect(game.height).toBe(1000);
  });
});
