import type { FsrsState, ProgressMap, Rating } from "@1000words/engine";
import type { LangPair } from "@1000words/content";
import type { ProgressStore } from "./progressStore";

const STORAGE_PREFIX = "1000w:progress:";

function storageKey(userId: string, langPair: LangPair): string {
  return `${STORAGE_PREFIX}${userId}:${langPair}`;
}

function langPairFromCardId(cardId: string): LangPair {
  const prefix = cardId.split("-")[0];
  if (prefix === "es") return "en-es";
  if (prefix === "zh") return "en-zh";
  return "en-es";
}

function readMap(userId: string, langPair: LangPair): ProgressMap {
  try {
    const raw = localStorage.getItem(storageKey(userId, langPair));
    return raw ? (JSON.parse(raw) as ProgressMap) : {};
  } catch {
    return {};
  }
}

function writeMap(userId: string, langPair: LangPair, map: ProgressMap): void {
  try {
    localStorage.setItem(storageKey(userId, langPair), JSON.stringify(map));
  } catch {
    // Storage quota exceeded — silently skip; session state is still intact.
  }
}

/** localStorage-backed progress store for demo mode. State survives page refreshes. */
export function createMockProgressStore(): ProgressStore {
  return {
    async getProgress(userId, langPair) {
      return readMap(userId, langPair);
    },

    async upsertProgress(userId, cardId, state: FsrsState) {
      const lp = langPairFromCardId(cardId);
      const map = readMap(userId, lp);
      map[cardId] = state;
      writeMap(userId, lp, map);
    },

    async logReview(_userId, _cardId, _rating: Rating, _elapsedMs) {
      // no-op in demo mode
    },
  };
}
