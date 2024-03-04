import { describe, expect, test } from "vitest";
import { RedDots } from "../src/games/red_dots.ts";

describe("RedDots game", () => {
  test("can be created with ID", () => {
    let game = new RedDots("foo");
    expect(game.id).toBe("foo");
  });
});
