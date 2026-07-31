import { createRefreshCoordinator } from "../data/refreshCoordinator";
import type {
  AppContextValue,
  AppServices,
  CompleteStudySessionCommand,
  RecordCardReviewCommand,
  RecordedCardReview,
  StudyCompletionResult,
  UserSettings,
} from "../data/types";

const settings: UserSettings = {
  themePreference: "system",
  dailyGoalMinutes: 15,
  autoAdvance: false,
  notifications: { streak: true, goalComplete: true, xpMilestone: false },
};

export function createTestServices(overrides: Partial<AppContextValue> = {}): AppContextValue {
  const repositories = {
    progressStore: {
      getProgress: async () => ({}), upsertProgress: async () => {}, logReview: async () => {},
    },
    studyRepo: {
      recordCardReview: async (command: RecordCardReviewCommand): Promise<RecordedCardReview> => ({ ...command, reviewedAt: new Date().toISOString(), progress: command.nextState, replayed: false }),
      completeStudySession: async (command: CompleteStudySessionCommand): Promise<StudyCompletionResult> => ({ sessionId: command.sessionId, completedAt: command.completedAt,
        localStudyDate: command.completedAt.slice(0, 10), cardsReviewed: 1, durationSeconds: 1, accuracy: 100,
        reviewXp: 10, achievementXp: 0, totalXpAwarded: 10,
        profile: { userId: "test-user", displayName: "Test Learner", bio: "", xp: 10, tokens: 100,
          streakCount: 1, lastActiveDate: command.completedAt.slice(0, 10), createdAt: null, settings },
        goals: [], totals: { cardsReviewed: 1, sessionsCompleted: 1, minutesStudied: 0, perfectSessions: 1 },
        unlockedAchievements: [], replayed: false }),
    },
    profileRepo: {
      getProfile: async (userId: string) => ({
        userId, displayName: "Test Learner", bio: "", xp: 0, tokens: 100,
        streakCount: 0, lastActiveDate: null, createdAt: "2026-01-01T00:00:00.000Z", settings,
      }),
      updateProfile: async () => {},
    },
    achievementRepo: { getUserAchievements: async () => [] },
    inventoryRepo: {
      getInventory: async () => [],
      getEquipped: async () => [],
      purchase: async (command: { itemId: string; requestId: string }) => ({
        requestId: command.requestId,
        itemId: command.itemId,
        tokenCost: 10,
        balance: 90,
        inventoryRecord: { itemId: command.itemId, purchasedAt: "2026-01-01T00:00:00.000Z" },
        status: "purchased" as const,
        replayed: false,
      }),
      equip: async (command: { itemId: string; requestId: string }) => ({
        requestId: command.requestId,
        itemId: command.itemId,
        equipped: { itemId: command.itemId, slot: "profile_picture" as const },
        replacedItemId: null,
        replayed: false,
      }),
    },
    goalRepo: { getTodayGoals: async () => [] },
    statsRepo: { getWeeklyXp: async () => [] },
    leaderboardRepo: { getTopN: async () => [], getCurrentUserEntry: async () => null },
  };
  const graph: AppServices = {
    mode: "demo", userId: "test-user", catalog: { lessons: [], achievements: [], storeItems: [] },
    ...repositories,
    dispose() {},
  };
  const coordinator = createRefreshCoordinator(graph);
  const value: AppContextValue = {
    userId: graph.userId,
    services: graph,
    coordinator,
    state: coordinator.getState(),
    refresh: coordinator.refresh,
    patchSnapshot: coordinator.patch,
    ...repositories,
  };
  return { ...value, ...overrides };
}
