import type { FsrsState, ProgressMap, Rating } from "@1000words/engine";
import type { LangPair } from "@1000words/content";
import type { ProgressStore } from "./progressStore";

/** In-memory progress store for demo mode. State is not persisted across reloads. */
export function createMockProgressStore(): ProgressStore {
  const store: Record<string, ProgressMap> = {};

  function key(userId: string, langPair: LangPair): string {
    return `${userId}:${langPair}`;
  }

  function langPairFromCardId(cardId: string): LangPair {
    const prefix = cardId.split("-")[0];
    if (prefix === "es") return "en-es";
    if (prefix === "zh") return "en-zh";
    return "en-es";
  }

  return {
    async getProgress(userId, langPair) {
      return store[key(userId, langPair)] ?? {};
    },

    async upsertProgress(userId, cardId, state: FsrsState) {
      const lp = langPairFromCardId(cardId);
      const k = key(userId, lp);
      store[k] = { ...(store[k] ?? {}), [cardId]: state };
    },

    async logReview(_userId, _cardId, _rating: Rating, _elapsedMs) {
      // no-op in mock mode
    },
  };
}
