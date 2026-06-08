import type { FsrsState, ProgressMap } from "@1000words/engine";
import type { LangPair } from "@1000words/content";

/**
 * Progress sync contract (Phase 0).
 *
 * The app reads the user's scheduling state for a deck, reviews cards locally via
 * the engine, then persists each updated card. Implementations talk to Supabase
 * `card_progress` (and append to `review_logs`) under task A2 — see docs/PLAN.md.
 */
export interface ProgressStore {
  /** Load all per-card scheduling state for one user + language pair. */
  getProgress(userId: string, langPair: LangPair): Promise<ProgressMap>;
  /** Persist (insert or update) one card's scheduling state. */
  upsertProgress(userId: string, cardId: string, state: FsrsState): Promise<void>;
}

// STUB — wired to Supabase under task A2.
export const progressStore: ProgressStore = {
  getProgress() {
    throw new Error("getProgress not implemented yet (task A2)");
  },
  upsertProgress() {
    throw new Error("upsertProgress not implemented yet (task A2)");
  },
};
