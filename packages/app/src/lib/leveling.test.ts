import { describe, expect, it } from "vitest";
import { computeLevelFromXp } from "./leveling";

describe("computeLevelFromXp", () => {
  it("starts a fresh account at level 1", () => {
    expect(computeLevelFromXp(0)).toEqual({ profileLevel: 1, xpToNextLevel: 250 });
  });

  it("advances a level every 250 xp", () => {
    expect(computeLevelFromXp(249)).toEqual({ profileLevel: 1, xpToNextLevel: 250 });
    expect(computeLevelFromXp(250)).toEqual({ profileLevel: 2, xpToNextLevel: 500 });
    expect(computeLevelFromXp(2840)).toEqual({ profileLevel: 12, xpToNextLevel: 3000 });
  });
});
