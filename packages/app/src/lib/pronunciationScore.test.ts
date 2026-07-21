import { describe, expect, it } from "vitest";
import { isCloseMatch, similarity } from "./pronunciationScore";

describe("pronunciationScore", () => {
  it("scores an exact match as 1", () => {
    expect(similarity("hola", "hola")).toBe(1);
  });

  it("is case- and whitespace-insensitive", () => {
    expect(similarity(" Hola ", "hola")).toBe(1);
  });

  it("ignores trailing punctuation", () => {
    expect(similarity("hola.", "hola")).toBe(1);
  });

  it("scores completely different words low", () => {
    expect(similarity("hola", "xyz")).toBeLessThan(0.3);
  });

  it("treats a near-miss transcript (e.g. STT dropping a silent letter) as a match", () => {
    expect(isCloseMatch("ola", "hola")).toBe(true);
  });

  it("treats an unrelated word as no match", () => {
    expect(isCloseMatch("adiós", "hola")).toBe(false);
  });

  it("never matches against an empty transcript", () => {
    expect(isCloseMatch("", "hola")).toBe(false);
  });

  it("compares non-Latin scripts character by character", () => {
    expect(similarity("你好", "你好")).toBe(1);
    expect(isCloseMatch("你", "你好")).toBe(false);
  });
});
