import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardData } from "./account/repository";
import { createMockAchievementRepository, createMockAchievementState } from "./achievements/mockAchievementRepository";
import { createSupabaseAchievementRepository } from "./achievements/supabaseAchievementRepository";
import { applyMockSessionGoals, createMockDailyGoalRepository, createMockDailyGoalState } from "./goals/mockDailyGoalRepository";
import { createSupabaseDailyGoalRepository } from "./goals/supabaseDailyGoalRepository";
import { createMockInventoryRepository } from "./inventory/mockInventoryRepository";
import { createSupabaseInventoryRepository } from "./inventory/supabaseInventoryRepository";
import { createMockLeaderboardRepository } from "./leaderboard/mockLeaderboardRepository";
import { createSupabaseLeaderboardRepository } from "./leaderboard/supabaseLeaderboardRepository";
import { createMockProfileRepository, createMockProfileState } from "./profile/mockProfileRepository";
import { createSupabaseProfileRepository } from "./profile/supabaseProfileRepository";
import { createProgressStore } from "./progressStore";
import { clearMockProgress, createMockProgressStore, type DemoReviewEvent } from "./progressStore.mock";
import { createMockStatsRepository } from "./stats/mockStatsRepository";
import { createSupabaseStatsRepository } from "./stats/supabaseStatsRepository";
import { createMockStudyRepository } from "./study/mockStudyRepository";
import { createSupabaseStudyRepository } from "./study/supabaseStudyRepository";
import type { AppMode, AppServices, Clock } from "./types";

export interface CreateAppServicesOptions {
  mode: AppMode;
  userId: string;
  seedData: DashboardData;
  client?: SupabaseClient;
  clock?: Clock;
  storage?: Storage;
}

const systemClock: Clock = { now: () => new Date() };

export function createAppServices(options: CreateAppServicesOptions): AppServices {
  const { mode, userId, seedData } = options;
  const clock = options.clock ?? systemClock;
  const now = () => clock.now();
  const catalog = {
    lessons: seedData.lessons,
    achievements: seedData.achievements,
    storeItems: seedData.storeItems,
  };

  if (mode === "supabase") {
    if (!options.client) throw new Error("Supabase mode requires an injected client");
    const client = options.client;
    return {
      mode,
      userId,
      catalog,
      progressStore: createProgressStore(client),
      studyRepo: createSupabaseStudyRepository(client),
      profileRepo: createSupabaseProfileRepository(client),
      achievementRepo: createSupabaseAchievementRepository(client),
      inventoryRepo: createSupabaseInventoryRepository(client),
      goalRepo: createSupabaseDailyGoalRepository(client),
      statsRepo: createSupabaseStatsRepository(client),
      leaderboardRepo: createSupabaseLeaderboardRepository(client),
      dispose() {},
    };
  }

  const storage = options.storage ?? localStorage;
  const reviewEvents: DemoReviewEvent[] = [];
  let progressStore = createMockProgressStore({ storage, now, reviewEvents });
  let profileState = createMockProfileState(seedData.profile);
  let achievementState = createMockAchievementState(seedData.achievements, now);
  let goalState = createMockDailyGoalState(seedData.dailyGoals);
  const studyOptions = () => ({
    userId,
    now,
    profileState,
    achievementCatalog: seedData.achievements,
    achievementState,
    lessonsCompleted: seedData.lessons.filter((item) => item.status === "completed").length,
    onReviewRecorded: async (command: import("./types").RecordCardReviewCommand) => {
      await progressStore.upsertProgress(userId, command.cardId, command.nextState);
      await progressStore.logReview(userId, command.cardId, command.rating, command.elapsedMs);
    },
    applySessionGoals: (metrics: { cardsReviewed: number; xpEarned: number; sessionsCompleted: number; streakCount: number }, date: string) =>
      applyMockSessionGoals(seedData.dailyGoals, goalState, metrics, date),
  });
  let studyRepo = createMockStudyRepository(studyOptions());
  let profileRepo = createMockProfileRepository(seedData.profile, profileState);
  let achievementRepo = createMockAchievementRepository(seedData.achievements, now, achievementState);
  const inventoryOptions = () => ({
    hasAchievement: (achievementId: string) => achievementState.earned.has(achievementId),
    getBalance: () => profileState.current.tokens,
    setBalance: (tokens: number) => { profileState.current = { ...profileState.current, tokens }; },
  });
  let inventoryRepo = createMockInventoryRepository(seedData.storeItems, now, inventoryOptions());
  let goalRepo = createMockDailyGoalRepository(seedData.dailyGoals, now, goalState);
  let statsRepo = createMockStatsRepository(reviewEvents, now);
  let leaderboardRepo = createMockLeaderboardRepository(userId);

  const resetRepositories = () => {
    reviewEvents.length = 0;
    progressStore = createMockProgressStore({ storage, now, reviewEvents });
    profileState = createMockProfileState(seedData.profile);
    achievementState = createMockAchievementState(seedData.achievements, now);
    goalState = createMockDailyGoalState(seedData.dailyGoals);
    studyRepo = createMockStudyRepository(studyOptions());
    profileRepo = createMockProfileRepository(seedData.profile, profileState);
    achievementRepo = createMockAchievementRepository(seedData.achievements, now, achievementState);
    inventoryRepo = createMockInventoryRepository(seedData.storeItems, now, inventoryOptions());
    goalRepo = createMockDailyGoalRepository(seedData.dailyGoals, now, goalState);
    statsRepo = createMockStatsRepository(reviewEvents, now);
    leaderboardRepo = createMockLeaderboardRepository(userId);
  };

  return {
    mode,
    userId,
    catalog,
    get progressStore() { return progressStore; },
    get studyRepo() { return studyRepo; },
    get profileRepo() { return profileRepo; },
    get achievementRepo() { return achievementRepo; },
    get inventoryRepo() { return inventoryRepo; },
    get goalRepo() { return goalRepo; },
    get statsRepo() { return statsRepo; },
    get leaderboardRepo() { return leaderboardRepo; },
    dispose() {
      reviewEvents.length = 0;
    },
    async resetDemoData() {
      clearMockProgress(storage, userId);
      resetRepositories();
    },
  };
}
