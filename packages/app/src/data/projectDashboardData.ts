import type { DashboardData } from "./account/repository";
import type { AuthSession, RefreshState } from "./types";
import { computeLevelFromXp } from "../lib/leveling";

interface ProjectDashboardDataOptions {
  session: AuthSession;
  seed: DashboardData;
  refreshState: RefreshState;
}

export function projectDashboardData({ session, seed, refreshState }: ProjectDashboardDataOptions): DashboardData | null {
  const live = refreshState.snapshot.profile;
  if (refreshState.versions.profile === 0 || !live) return null;

  const { profileLevel, xpToNextLevel } = computeLevelFromXp(live.xp);
  const owned = new Set(refreshState.snapshot.inventory.map((item) => item.itemId));
  const equipped = new Set(refreshState.snapshot.equipped.map((item) => item.itemId));
  const earned = new Map(refreshState.snapshot.achievements.map((item) => [item.achievementId, item.earnedAt]));
  const goalsLoaded = refreshState.versions.goals > 0;

  return {
    ...seed,
    user: { ...seed.user, userId: session.userId, email: session.email },
    profile: {
      ...seed.profile,
      userId: session.userId,
      displayName: live.displayName,
      email: session.email,
      bio: live.bio,
      xp: live.xp,
      tokens: live.tokens,
      streakDays: live.streakCount,
      profileLevel,
      xpToNextLevel,
      themePreference: live.settings.themePreference,
      lastActiveDate: live.lastActiveDate ?? "",
      joinedDate: live.createdAt ?? "",
    },
    achievements: seed.achievements.map((definition) => ({
      ...definition,
      status: earned.has(definition.achievementId)
        ? "completed" as const
        : definition.status === "locked" ? "locked" as const : "in_progress" as const,
      completedAt: earned.get(definition.achievementId) ?? null,
    })),
    storeItems: seed.storeItems.map((item) => ({
      ...item,
      isOwned: owned.has(item.storeItemId),
      isEquipped: equipped.has(item.storeItemId),
    })),
    dailyGoals: seed.dailyGoals.map((goal) => {
      const liveGoal = goalsLoaded
        ? refreshState.snapshot.goals.find((item) => item.goalType === goal.goalId)
        : undefined;
      const progress = liveGoal?.current ?? 0;
      return {
        ...goal,
        target: liveGoal?.target ?? goal.target,
        progress,
        status: goal.status === "locked" ? "locked" as const
          : progress >= (liveGoal?.target ?? goal.target) ? "completed" as const : "in_progress" as const,
      };
    }),
  };
}
