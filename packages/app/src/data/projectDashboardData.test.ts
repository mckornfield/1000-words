import { describe, expect, it } from "vitest";
import { localAccountRepository } from "./account/repository";
import { projectDashboardData } from "./projectDashboardData";
import type { AppProfile, RefreshState } from "./types";

const seed = localAccountRepository.getDashboardData("Usr-001");
const session = { userId: "live-user", email: "live@example.com" };
const emptyState: RefreshState = {
  snapshot: { profile: null, goals: [], achievements: [], inventory: [], equipped: [], stats: [], leaderboard: { entries: [], currentUser: null } },
  pending: new Set(), errors: {},
  versions: { profile: 0, goals: 0, achievements: 0, inventory: 0, equipped: 0, stats: 0, leaderboard: 0 },
};
const liveProfile: AppProfile = {
  userId: session.userId, displayName: "Live Learner", bio: "", xp: 0, tokens: 0,
  streakCount: 0, lastActiveDate: null, createdAt: null, timeZone: "America/New_York",
  settings: { themePreference: "system", dailyGoalMinutes: 15, autoAdvance: false, notifications: { streak: true, goalComplete: true, xpMilestone: false } },
};

describe("dashboard projection", () => {
  it("does not project demo fixtures before an authenticated profile has loaded", () => {
    expect(projectDashboardData({ session, seed, refreshState: emptyState })).toBeNull();
  });

  it("preserves authoritative zero and empty values instead of demo account state", () => {
    const refreshState: RefreshState = {
      ...emptyState,
      snapshot: { ...emptyState.snapshot, profile: liveProfile },
      versions: { ...emptyState.versions, profile: 1, goals: 1, achievements: 1, inventory: 1, equipped: 1 },
    };
    const result = projectDashboardData({ session, seed, refreshState });
    expect(result?.profile).toMatchObject({ userId: "live-user", xp: 0, tokens: 0, streakDays: 0 });
    expect(result?.dailyGoals.every((goal) => goal.progress === 0)).toBe(true);
    expect(result?.achievements.every((achievement) => achievement.status !== "completed")).toBe(true);
    expect(result?.storeItems.every((item) => !item.isOwned && !item.isEquipped)).toBe(true);
  });
});
