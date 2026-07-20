/**
 * Word data utilities.
 * Loads the en-es vocabulary from the public asset and provides
 * functions to slice/filter words appropriate for each lesson difficulty.
 */

export interface WordEntry {
  id: string;
  langPair: string;
  word: string;
  translation: string;
  partOfSpeech: string;
  exampleSentence: string;
  exampleTranslation: string;
  pronunciation?: string;
  audio: string;
}

// ─── Cache ────────────────────────────────────────────────────────────────────

const _cache = new Map<string, WordEntry[]>();
const _promises = new Map<string, Promise<WordEntry[]>>();

/**
 * Lazily fetch and cache all word entries for a given lang pair.
 * Subsequent calls for the same pair return the cached result.
 */
export async function loadAllWords(langPair = "en-es"): Promise<WordEntry[]> {
  if (_cache.has(langPair)) return _cache.get(langPair)!;
  if (_promises.has(langPair)) return _promises.get(langPair)!;

  const promise = fetch(`${import.meta.env.BASE_URL}assets/data/${langPair}.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to fetch word data for ${langPair}: ${r.status}`);
      return r.json() as Promise<WordEntry[]>;
    })
    .then((data) => {
      _cache.set(langPair, data);
      return data;
    });

  _promises.set(langPair, promise);
  return promise;
}

// ─── Difficulty ranges (index into the 1–1000 frequency-ranked list) ─────────
// Words are ordered from highest → lowest frequency in the dataset.
// Starter: top-100 most common words (indices 0–99)
// Core: words 100–399 (indices 100–399)
// Advanced: words 400+ (indices 400–999)

const DIFFICULTY_RANGES: Record<"starter" | "core" | "advanced", [number, number]> = {
  starter:  [0,   100],
  core:     [100, 400],
  advanced: [400, 1000],
};

/**
 * Synchronously get words for a lesson if already loaded, or return [].
 * Use `loadWordsForLesson` for the async version.
 */
export function getWordsForDifficulty(
  difficulty: "starter" | "core" | "advanced",
  count = 20,
  offset = 0,
): WordEntry[] {
  const cached = _cache.get("en-es");
  if (!cached) return [];
  const [start, end] = DIFFICULTY_RANGES[difficulty];
  return cached.slice(start + offset, Math.min(start + offset + count, end));
}

/**
 * Async version of getWordsForDifficulty — loads data on first call.
 */
export async function loadWordsForLesson(
  difficulty: "starter" | "core" | "advanced",
  count = 20,
  offset = 0,
): Promise<WordEntry[]> {
  const all = await loadAllWords("en-es");
  const [start, end] = DIFFICULTY_RANGES[difficulty];
  return all.slice(start + offset, Math.min(start + offset + count, end));
}

/**
 * Get a deterministic subset of words for a specific lessonId.
 * Different lessons of the same difficulty get different word ranges.
 */
export async function loadWordsForLessonId(
  lessonId: string,
  difficulty: "starter" | "core" | "advanced",
  count = 20,
): Promise<WordEntry[]> {
  // Derive an offset from lessonId to give each lesson unique words
  const lessonNum = parseInt(lessonId.replace(/\D/g, ""), 10) || 0;
  const offset = (lessonNum - 1) * count;
  return loadWordsForLesson(difficulty, count, offset);
}

/**
 * Load the full word pool for a given lang pair (e.g. "en-es", "en-zh").
 * Passes everything to the FSRS engine so it can pick what's due + new words.
 */
export async function loadWordsForLangPair(langPair: string): Promise<WordEntry[]> {
  return loadAllWords(langPair);
}

/**
 * Resolve a card's relative audio path against BASE_URL.
 * Needed because history-based routes (e.g. /study/en-es) aren't at the
 * document root, so a bare relative path resolves incorrectly.
 */
export function audioUrl(entry: Pick<WordEntry, "audio">): string {
  return `${import.meta.env.BASE_URL}${entry.audio}`;
}
