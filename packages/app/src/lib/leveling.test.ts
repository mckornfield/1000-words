import { describe, expect, it } from "vitest";
import { computeLevelFromXp } from "./leveling";

describe("computeLevelFromXp", () => {
  it("starts a fresh account at level 1", () => {
    expect(computeLevelFromXp(0)).toEqual({ profileLevel: 1, xpToNextLevel: 500 });
  });

  it("advances a level every 500 xp", () => {
    expect(computeLevelFromXp(499)).toEqual({ profileLevel: 1, xpToNextLevel: 500 });
    expect(computeLevelFromXp(500)).toEqual({ profileLevel: 2, xpToNextLevel: 1000 });
    expect(computeLevelFromXp(2840)).toEqual({ profileLevel: 6, xpToNextLevel: 3000 });
  });
});
