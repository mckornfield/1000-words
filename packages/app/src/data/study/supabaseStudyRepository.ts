import type { SupabaseClient } from "@supabase/supabase-js";
import type { StudyRepository } from "../types";
import { RecordedCardReviewSchema, StudyCompletionResultSchema } from "../rpcSchemas";

const ratingCode = { again: 1, hard: 2, good: 3, easy: 4 } as const;

function assertIdentity(
  operation: string,
  expected: Record<string, string>,
  actual: Record<string, string>,
): void {
  const mismatch = Object.keys(expected).find((field) => expected[field] !== actual[field]);
  if (!mismatch) return;
  const cause = new Error(`${mismatch} expected ${expected[mismatch]}, received ${actual[mismatch]}`);
  throw new Error(`${operation} response identity mismatch`, { cause });
}

export function createSupabaseStudyRepository(client: SupabaseClient): StudyRepository {
  return {
    async recordCardReview(command) {
      const { data, error } = await client.rpc("record_card_review", {
        p_review_id: command.reviewId,
        p_session_id: command.sessionId,
        p_lang_pair: command.langPair,
        p_card_id: command.cardId,
        p_rating: ratingCode[command.rating],
        p_elapsed_ms: command.elapsedMs,
        p_next_state: command.nextState,
      });
      if (error) throw error;
      const parsed = RecordedCardReviewSchema.parse(data);
      assertIdentity(
        "record_card_review",
        { reviewId: command.reviewId, sessionId: command.sessionId, cardId: command.cardId },
        { reviewId: parsed.reviewId, sessionId: parsed.sessionId, cardId: parsed.cardId },
      );
      return parsed;
    },
    async completeStudySession(command) {
      const { data, error } = await client.rpc("complete_study_session", {
        p_session_id: command.sessionId,
        p_lang_pair: command.langPair,
        p_started_at: command.startedAt,
        p_completed_at: command.completedAt,
      });
      if (error) throw error;
      const parsed = StudyCompletionResultSchema.parse(data);
      assertIdentity(
        "complete_study_session",
        { sessionId: command.sessionId },
        { sessionId: parsed.sessionId },
      );
      return parsed;
    },
  };
}
