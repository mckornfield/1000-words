import { describe, expect, it } from "vitest";
import { CardSchema, LANG_PAIRS } from "./schema";
import { SAMPLE_CARDS } from "./fixtures/sample-cards";

describe("CardSchema", () => {
  it("accepts every sample card", () => {
    for (const card of SAMPLE_CARDS) {
      expect(() => CardSchema.parse(card)).not.toThrow();
    }
  });

  it("rejects an unknown language pair", () => {
    const bad = { ...SAMPLE_CARDS[0], langPair: "en-fr" };
    expect(CardSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an audio path that is not under assets/audio/<lang>/*.mp3", () => {
    const bad = { ...SAMPLE_CARDS[0], audio: "sounds/hola.wav" };
    expect(CardSchema.safeParse(bad).success).toBe(false);
  });

  it("exposes the shipped language pairs", () => {
    expect(LANG_PAIRS).toContain("en-es");
    expect(LANG_PAIRS).toContain("en-zh");
  });
});
