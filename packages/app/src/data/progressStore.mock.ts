import type { FsrsState, ProgressMap, Rating } from "@1000words/engine";
import { languageForCardId, type LangPair } from "@1000words/content";
import type { ProgressStore } from "./progressStore";

const STORAGE_PREFIX = "1000w:progress:";

function storageKey(userId: string, langPair: LangPair): string {
  return `${STORAGE_PREFIX}${userId}:${langPair}`;
}

function langPairFromCardId(cardId: string): LangPair {
  const registration = languageForCardId(cardId);
  if (registration) return registration.id;
  throw new Error(`Cannot derive langPair from card id: ${cardId}`);
}

export interface DemoReviewEvent {
  reviewedAt: string;
  rating: Rating;
}

interface MockProgressOptions {
  storage?: Storage;
  now?: () => Date;
  reviewEvents?: DemoReviewEvent[];
}

function readMap(storage: Storage, userId: string, langPair: LangPair): ProgressMap {
  try {
    const raw = storage.getItem(storageKey(userId, langPair));
    return raw ? (JSON.parse(raw) as ProgressMap) : {};
  } catch {
    return {};
  }
}

function writeMap(storage: Storage, userId: string, langPair: LangPair, map: ProgressMap): void {
  try {
    storage.setItem(storageKey(userId, langPair), JSON.stringify(map));
  } catch {
    // Storage quota exceeded — session state remains available to the caller.
  }
}

/** localStorage-backed progress store for demo mode. State survives graph disposal. */
export function createMockProgressStore(options: MockProgressOptions = {}): ProgressStore {
  const storage = options.storage ?? localStorage;
  const memory = new Map<string, ProgressMap>();

  const getMap = (userId: string, langPair: LangPair): ProgressMap => {
    const key = storageKey(userId, langPair);
    const cached = memory.get(key);
    if (cached) return cached;
    const loaded = readMap(storage, userId, langPair);
    memory.set(key, loaded);
    return loaded;
  };

  return {
    async getProgress(userId, langPair) {
      return { ...getMap(userId, langPair) };
    },
    async upsertProgress(userId, cardId, state: FsrsState) {
      const langPair = langPairFromCardId(cardId);
      const map = getMap(userId, langPair);
      map[cardId] = state;
      writeMap(storage, userId, langPair, map);
    },
    async logReview(_userId, _cardId, rating: Rating, _elapsedMs) {
      options.reviewEvents?.push({
        reviewedAt: (options.now ?? (() => new Date()))().toISOString(),
        rating,
      });
    },
  };
}

export function clearMockProgress(storage: Storage, userId: string): void {
  const prefix = `${STORAGE_PREFIX}${userId}:`;
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
    .filter((key): key is string => key !== null && key.startsWith(prefix));
  keys.forEach((key) => storage.removeItem(key));
}
