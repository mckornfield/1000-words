import { describe, expect, it, vi } from "vitest";
import { initialState } from "@1000words/engine";
import { createMockStudyRepository } from "./mockStudyRepository";

const command = {
  reviewId: "00000000-0000-4000-8000-000000000001",
  sessionId: "00000000-0000-4000-8000-000000000002",
  langPair: "en-es" as const,
  cardId: "es-0001",
  rating: "good" as const,
  elapsedMs: 1000,
  nextState: initialState(new Date("2026-07-26T10:00:00Z")),
};

describe("mock study repository", () => {
  it("replays a review id without applying it twice", async () => {
    const onReviewRecorded = vi.fn();
    const repo = createMockStudyRepository({
      userId: "u",
      now: () => new Date("2026-07-26T10:00:00Z"),
      onReviewRecorded,
    });
    expect((await repo.recordCardReview(command)).replayed).toBe(false);
    expect((await repo.recordCardReview(command)).replayed).toBe(true);
    expect(onReviewRecorded).toHaveBeenCalledOnce();
    expect(onReviewRecorded).toHaveBeenCalledWith(command);
  });

  it("rejects reuse of a review id with a changed payload", async () => {
    const repo = createMockStudyRepository({ userId: "u" });
    await repo.recordCardReview(command);
    await expect(repo.recordCardReview({ ...command, cardId: "es-0002" })).rejects.toThrow("idempotency_conflict");
  });

  it("uses the profile timezone for the canonical local study day", async () => {
    const repo = createMockStudyRepository({
      userId: "u",
      profile: {
        userId: "u", displayName: "Learner", bio: "", xp: 0, tokens: 0,
        streakCount: 0, lastActiveDate: null, createdAt: null,
        timeZone: "America/Los_Angeles",
        settings: {
          themePreference: "system", dailyGoalMinutes: 15, autoAdvance: false,
          notifications: { streak: true, goalComplete: true, xpMilestone: false },
        },
      },
    });
    await repo.recordCardReview(command);
    const result = await repo.completeStudySession({
      sessionId: command.sessionId,
      langPair: command.langPair,
      startedAt: "2026-07-26T00:29:00Z",
      completedAt: "2026-07-26T00:30:00Z",
    });
    expect(result.localStudyDate).toBe("2026-07-25");
  });

  it("grants catalog-owned achievement XP once during completion", async () => {
    const achievementState = { earned: new Map<string, string>() };
    const repo = createMockStudyRepository({
      userId: "u",
      now: () => new Date("2026-07-26T10:00:00Z"),
      achievementState,
      achievementCatalog: [{
        achievementId: "Ach-001",
        title: "First review",
        description: "Review a card",
        xpReward: 100,
        rarity: "common",
        icon: "star",
        iconFallback: "star",
        status: "in_progress",
        completedAt: null,
        prerequisiteId: null,
        criteria: { type: "cards_reviewed_total", target: 1 },
      }],
    });
    await repo.recordCardReview(command);
    const completion = {
      sessionId: command.sessionId,
      langPair: command.langPair,
      startedAt: "2026-07-26T09:59:00Z",
      completedAt: "2026-07-26T10:00:00Z",
    };
    const first = await repo.completeStudySession(completion);
    const replay = await repo.completeStudySession(completion);
    expect(first).toMatchObject({ reviewXp: 10, achievementXp: 100, totalXpAwarded: 110 });
    expect(first.unlockedAchievements).toHaveLength(1);
    expect(achievementState.earned.has("Ach-001")).toBe(true);
    expect(replay).toEqual({ ...first, replayed: true });
  });

  it("returns one byte-stable completion reward for retries", async () => {
    const repo = createMockStudyRepository({ userId: "u", now: () => new Date("2026-07-26T10:00:00Z") });
    await repo.recordCardReview(command);
    const completion = { sessionId: command.sessionId, langPair: command.langPair, startedAt: "2026-07-26T09:59:00Z", completedAt: "2026-07-26T10:00:00Z" };
    const first = await repo.completeStudySession(completion);
    const second = await repo.completeStudySession(completion);
    expect(first.totalXpAwarded).toBe(10);
    expect(second).toEqual({ ...first, replayed: true });
  });

  it("rejects reuse of a session id with a changed completion command", async () => {
    const repo = createMockStudyRepository({ userId: "u" });
    await repo.recordCardReview(command);
    const completion = { sessionId: command.sessionId, langPair: command.langPair, startedAt: "2026-07-26T09:59:00Z", completedAt: "2026-07-26T10:00:00Z" };
    await repo.completeStudySession(completion);
    await expect(repo.completeStudySession({ ...completion, langPair: "en-zh" })).rejects.toThrow("idempotency_conflict");
  });
});
