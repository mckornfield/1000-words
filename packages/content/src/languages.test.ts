import { describe, expect, it } from "vitest";
import {
  LANGUAGE_REGISTRY,
  LANG_PAIRS,
  availableLanguages,
  getLanguage,
  languageForCardId,
  requireLanguage,
} from "./languages";

describe("language registry", () => {
  it("is the single ordered source for all shipped language pairs", () => {
    expect(LANG_PAIRS).toEqual(["en-es", "en-zh", "en-ko", "en-ja"]);
    expect(LANGUAGE_REGISTRY.map((entry) => entry.id)).toEqual(LANG_PAIRS);
    expect(availableLanguages()).toHaveLength(4);
  });

  it("has unique security- and asset-critical metadata", () => {
    for (const field of ["id", "cardIdPrefix", "deckPath", "audioDirectory"] as const) {
      const values = LANGUAGE_REGISTRY.map((entry) => entry[field]);
      expect(new Set(values).size, field).toBe(values.length);
    }
  });

  it("declares valid speech locales and recognition support", () => {
    for (const entry of LANGUAGE_REGISTRY) {
      expect(() => new Intl.Locale(entry.speechLocale)).not.toThrow();
      expect(entry.supportedDirections).toContain("recognition");
      expect(entry.availability).toBe("shipped");
    }
  });

  it("looks up pairs and rejects unsupported ones", () => {
    expect(getLanguage("en-ko")?.target.displayName).toBe("Korean");
    expect(getLanguage("en-fr")).toBeUndefined();
    expect(() => requireLanguage("en-fr")).toThrow(/Unsupported language pair/);
  });

  it("maps card IDs by exact registered prefix", () => {
    expect(languageForCardId("es-0001")?.id).toBe("en-es");
    expect(languageForCardId("ja-0999")?.id).toBe("en-ja");
    expect(languageForCardId("esoteric-0001")).toBeUndefined();
    expect(languageForCardId("fr-0001")).toBeUndefined();
  });
});
