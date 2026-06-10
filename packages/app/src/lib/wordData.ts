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
  audio: string;
}

// ─── Cache ────────────────────────────────────────────────────────────────────

let _cachedWords: WordEntry[] | null = null;
let _loadPromise: Promise<WordEntry[]> | null = null;

/**
 * Lazily fetch and cache all word entries from the en-es dataset.
 * Subsequent calls return the same promise/result.
 */
export async function loadAllWords(): Promise<WordEntry[]> {
  if (_cachedWords) return _cachedWords;
  if (_loadPromise) return _loadPromise;

  _loadPromise = fetch("/assets/data/en-es.json")
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to fetch word data: ${r.status}`);
      return r.json() as Promise<WordEntry[]>;
    })
    .then((data) => {
      _cachedWords = data;
      return data;
    });

  return _loadPromise;
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
  if (!_cachedWords) return [];
  const [start, end] = DIFFICULTY_RANGES[difficulty];
  return (_cachedWords ?? []).slice(start + offset, Math.min(start + offset + count, end));
}

/**
 * Async version of getWordsForDifficulty — loads data on first call.
 */
export async function loadWordsForLesson(
  difficulty: "starter" | "core" | "advanced",
  count = 20,
  offset = 0,
): Promise<WordEntry[]> {
  const all = await loadAllWords();
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
