import type { SupabaseClient } from "@supabase/supabase-js";
import type { FsrsState, ProgressMap, Rating } from "@1000words/engine";
import type { LangPair } from "@1000words/content";

/**
 * Progress sync contract.
 *
 * The app reads the user's scheduling state for a deck, reviews cards locally
 * via the engine, then persists each updated card and appends a review log.
 * Backed by Supabase `card_progress` + `review_logs`; row-level security
 * (see supabase/migrations) restricts access to the calling user.
 */
export interface ProgressStore {
  /** Load all per-card scheduling state for one user + language pair. */
  getProgress(userId: string, langPair: LangPair): Promise<ProgressMap>;
  /** Persist (insert or update) one card's scheduling state. */
  upsertProgress(userId: string, cardId: string, state: FsrsState): Promise<void>;
  /** Append an immutable review log entry. */
  logReview(
    userId: string,
    cardId: string,
    rating: Rating,
    elapsedMs?: number,
  ): Promise<void>;
}

/** Maps our app-facing rating to the smallint stored in review_logs.rating. */
const RATING_CODE: Record<Rating, number> = {
  again: 1,
  hard: 2,
  good: 3,
  easy: 4,
};

/**
 * Card ids are prefixed by target-language code (e.g. "es-0001", "zh-0001"),
 * so we derive lang_pair from the id rather than threading it through every
 * call. Keep aligned with the Card schema in @1000words/content.
 */
function langPairFromCardId(cardId: string): LangPair {
  const target = cardId.split("-")[0];
  if (target === "es") return "en-es";
  if (target === "zh") return "en-zh";
  if (target === "ko") return "en-ko";
  if (target === "ja") return "en-ja";
  throw new Error(`Cannot derive langPair from card id: ${cardId}`);
}

interface CardProgressRow {
  card_id: string;
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: string | null;
}

function rowToState(row: CardProgressRow): FsrsState {
  return {
    due: row.due,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsedDays: row.elapsed_days,
    scheduledDays: row.scheduled_days,
    learningSteps: row.learning_steps,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state,
    lastReview: row.last_review,
  };
}

export function createProgressStore(client: SupabaseClient): ProgressStore {
  return {
    async getProgress(userId, langPair) {
      const { data, error } = await client
        .from("card_progress")
        .select(
          "card_id, due, stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses, state, last_review",
        )
        .eq("user_id", userId)
        .eq("lang_pair", langPair);
      if (error) throw error;
      const map: ProgressMap = {};
      for (const row of (data ?? []) as CardProgressRow[]) {
        map[row.card_id] = rowToState(row);
      }
      return map;
    },

    async upsertProgress(userId, cardId, state) {
      const { error } = await client.from("card_progress").upsert(
        {
          user_id: userId,
          card_id: cardId,
          lang_pair: langPairFromCardId(cardId),
          due: state.due,
          stability: state.stability,
          difficulty: state.difficulty,
          elapsed_days: state.elapsedDays,
          scheduled_days: state.scheduledDays,
          learning_steps: state.learningSteps,
          reps: state.reps,
          lapses: state.lapses,
          state: state.state,
          last_review: state.lastReview,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,card_id" },
      );
      if (error) throw error;
    },

    async logReview(userId, cardId, rating, elapsedMs) {
      const { error } = await client.from("review_logs").insert({
        user_id: userId,
        card_id: cardId,
        rating: RATING_CODE[rating],
        elapsed_ms: elapsedMs ?? null,
      });
      if (error) throw error;
    },
  };
}
