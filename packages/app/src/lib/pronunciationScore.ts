/**
 * Coarse pronunciation check: compares a speech-to-text transcript against
 * the expected word/phrase via normalized edit distance. This is NOT
 * phoneme-level scoring (that needs a cloud API) — it can only tell you
 * whether the recognizer heard something close to the right word.
 */

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  // Flat (rows * cols) buffer instead of nested arrays — sidesteps
  // noUncheckedIndexedAccess noise since every index is bounds-checked by construction.
  const dist = new Array<number>(rows * cols).fill(0);
  const at = (i: number, j: number) => dist[i * cols + j] ?? 0;
  const set = (i: number, j: number, v: number) => { dist[i * cols + j] = v; };

  for (let i = 0; i < rows; i++) set(i, 0, i);
  for (let j = 0; j < cols; j++) set(0, j, j);

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      set(i, j, Math.min(
        at(i - 1, j) + 1,
        at(i, j - 1) + 1,
        at(i - 1, j - 1) + cost,
      ));
    }
  }
  return at(rows - 1, cols - 1);
}

function normalize(s: string): string {
  return s.trim().toLowerCase().normalize("NFKC").replace(/[.,!?¿¡、。！？]/g, "");
}

/** Similarity in [0, 1], 1 = identical after normalization. */
export function similarity(transcript: string, expected: string): number {
  const t = normalize(transcript);
  const e = normalize(expected);
  if (!t || !e) return 0;
  const maxLen = Math.max(t.length, e.length);
  return 1 - levenshtein(t, e) / maxLen;
}

export function isCloseMatch(transcript: string, expected: string, threshold = 0.7): boolean {
  return similarity(transcript, expected) >= threshold;
}
