import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { initialState } from "@1000words/engine";
import { createSupabaseStudyRepository } from "./supabaseStudyRepository";

const state = initialState(new Date("2026-07-26T00:00:00Z"));
const command = { reviewId: crypto.randomUUID(), sessionId: crypto.randomUUID(), langPair: "en-es" as const, cardId: "es-0001", rating: "good" as const, elapsedMs: 100, nextState: state };

const profile = {
  userId: "user-1", displayName: "Ari", bio: "", xp: 10, tokens: 20, streakCount: 1,
  lastActiveDate: null, createdAt: null,
  settings: {
    themePreference: "system" as const, dailyGoalMinutes: 15, autoAdvance: false,
    notifications: { streak: true, goalComplete: true, xpMilestone: false },
  },
};

describe("Supabase study repository", () => {
  it("calls record_card_review without user or reward claims and parses the result", async () => {
    const data = { reviewId: command.reviewId, sessionId: command.sessionId, cardId: command.cardId, rating: "good", reviewedAt: "2026-07-26T00:00:00Z", progress: state, replayed: false };
    const rpc = vi.fn().mockResolvedValue({ data, error: null });
    const result = await createSupabaseStudyRepository({ rpc } as unknown as SupabaseClient).recordCardReview(command);
    expect(rpc).toHaveBeenCalledWith("record_card_review", expect.objectContaining({ p_review_id: command.reviewId, p_next_state: state }));
    expect(rpc.mock.calls[0]![1]).not.toHaveProperty("user_id");
    expect(result).toEqual(data);
  });

  it("rejects malformed trusted RPC JSON", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { replayed: false }, error: null });
    await expect(createSupabaseStudyRepository({ rpc } as unknown as SupabaseClient).recordCardReview(command)).rejects.toThrow();
  });

  it.each(["reviewId", "sessionId", "cardId"] as const)("rejects a parsed review whose %s differs from the command", async (field) => {
    const data = {
      reviewId: command.reviewId, sessionId: command.sessionId, cardId: command.cardId, rating: command.rating,
      reviewedAt: "2026-07-26T00:00:00Z", progress: state, replayed: false,
      [field]: field === "cardId" ? "es-9999" : crypto.randomUUID(),
    };
    const rpc = vi.fn().mockResolvedValue({ data, error: null });

    await expect(createSupabaseStudyRepository({ rpc } as unknown as SupabaseClient).recordCardReview(command)).rejects.toMatchObject({
      message: expect.stringMatching(/identity/i),
      cause: expect.any(Error),
    });
  });

  it("rejects a parsed completion whose session differs from the command", async () => {
    const completionCommand = {
      sessionId: crypto.randomUUID(), langPair: "en-es" as const,
      startedAt: "2026-07-26T00:00:00Z", completedAt: "2026-07-26T00:01:00Z",
    };
    const data = {
      sessionId: crypto.randomUUID(), completedAt: completionCommand.completedAt, localStudyDate: "2026-07-26",
      cardsReviewed: 1, durationSeconds: 60, accuracy: 100, reviewXp: 10, achievementXp: 0,
      totalXpAwarded: 10, profile, goals: [],
      totals: { cardsReviewed: 1, sessionsCompleted: 1, minutesStudied: 1, perfectSessions: 1 },
      unlockedAchievements: [], replayed: false,
    };
    const rpc = vi.fn().mockResolvedValue({ data, error: null });

    await expect(createSupabaseStudyRepository({ rpc } as unknown as SupabaseClient).completeStudySession(completionCommand)).rejects.toMatchObject({
      message: expect.stringMatching(/identity/i),
      cause: expect.any(Error),
    });
  });
});
