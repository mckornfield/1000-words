import {
  CardDeckSchema,
  LangPairSchema,
  requireLanguage,
  type Card,
  type CardDeck,
  type LangPair,
} from "@1000words/content";

export type WordEntry = Card;
export type DeckLoadErrorKind =
  | "unsupported-language"
  | "not-found"
  | "http"
  | "invalid-json"
  | "invalid-schema"
  | "network";

export class DeckLoadError extends Error {
  constructor(
    public readonly kind: DeckLoadErrorKind,
    public readonly langPair: string,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "DeckLoadError";
  }
}

const cache = new Map<LangPair, CardDeck>();
const promises = new Map<LangPair, Promise<CardDeck>>();

export function clearWordDataCache(langPair?: LangPair): void {
  if (langPair) {
    cache.delete(langPair);
    promises.delete(langPair);
  } else {
    cache.clear();
    promises.clear();
  }
}

function normalizedBase(baseUrl: string): string {
  const withLeadingSlash = baseUrl.startsWith("/") ? baseUrl : `/${baseUrl}`;
  return `${withLeadingSlash.replace(/\/+$/, "")}/`;
}

export function deckAssetUrl(langPair: LangPair, baseUrl = import.meta.env.BASE_URL): string {
  return `${normalizedBase(baseUrl)}${requireLanguage(langPair).deckPath}`;
}

export interface LoadWordsOptions {
  baseUrl?: string;
}

export async function loadAllWords(
  requestedPair = "en-es",
  options: LoadWordsOptions = {},
): Promise<CardDeck> {
  const pairResult = LangPairSchema.safeParse(requestedPair);
  if (!pairResult.success) {
    throw new DeckLoadError(
      "unsupported-language",
      requestedPair,
      `Unsupported language pair: ${requestedPair}`,
      { cause: pairResult.error },
    );
  }
  const langPair = pairResult.data;
  const cached = cache.get(langPair);
  if (cached) return cached;
  const pending = promises.get(langPair);
  if (pending) return pending;

  const promise = (async (): Promise<CardDeck> => {
    let response: Response;
    try {
      response = await fetch(deckAssetUrl(langPair, options.baseUrl));
    } catch (cause) {
      throw new DeckLoadError("network", langPair, `Could not load the ${langPair} deck.`, { cause });
    }
    if (!response.ok) {
      const kind = response.status === 404 ? "not-found" : "http";
      throw new DeckLoadError(kind, langPair, `Deck request failed with HTTP ${response.status}.`);
    }

    let raw: unknown;
    try {
      raw = await response.json();
    } catch (cause) {
      throw new DeckLoadError("invalid-json", langPair, `The ${langPair} deck is not valid JSON.`, { cause });
    }
    const parsed = CardDeckSchema.safeParse(raw);
    if (!parsed.success) {
      throw new DeckLoadError("invalid-schema", langPair, `The ${langPair} deck has an invalid schema.`, {
        cause: parsed.error,
      });
    }
    if (parsed.data.some((card) => card.langPair !== langPair)) {
      throw new DeckLoadError(
        "invalid-schema",
        langPair,
        `The ${langPair} deck contains cards for another language pair.`,
      );
    }
    cache.set(langPair, parsed.data);
    return parsed.data;
  })();

  promises.set(langPair, promise);
  try {
    return await promise;
  } finally {
    if (promises.get(langPair) === promise) promises.delete(langPair);
  }
}

const DIFFICULTY_RANGES: Record<"starter" | "core" | "advanced", [number, number]> = {
  starter: [0, 100],
  core: [100, 400],
  advanced: [400, 1000],
};

export function getWordsForDifficulty(
  difficulty: "starter" | "core" | "advanced",
  count = 20,
  offset = 0,
): WordEntry[] {
  const cached = cache.get("en-es");
  if (!cached) return [];
  const [start, end] = DIFFICULTY_RANGES[difficulty];
  return cached.slice(start + offset, Math.min(start + offset + count, end));
}

export async function loadWordsForLesson(
  difficulty: "starter" | "core" | "advanced",
  count = 20,
  offset = 0,
): Promise<WordEntry[]> {
  const all = await loadAllWords("en-es");
  const [start, end] = DIFFICULTY_RANGES[difficulty];
  return all.slice(start + offset, Math.min(start + offset + count, end));
}

export async function loadWordsForLessonId(
  lessonId: string,
  difficulty: "starter" | "core" | "advanced",
  count = 20,
): Promise<WordEntry[]> {
  const lessonNum = parseInt(lessonId.replace(/\D/g, ""), 10) || 0;
  return loadWordsForLesson(difficulty, count, (lessonNum - 1) * count);
}

export async function loadWordsForLangPair(langPair: string): Promise<CardDeck> {
  return loadAllWords(langPair);
}

export function audioUrl(entry: Pick<WordEntry, "audio">): string {
  return `${normalizedBase(import.meta.env.BASE_URL)}${entry.audio}`;
}
