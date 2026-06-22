import type { Achievement } from "../account/schema";
import type { AchievementRepository, UserAchievement } from "../types";

export function createMockAchievementRepository(achievements: Achievement[]): AchievementRepository {
  const earned = new Map(
    achievements
      .filter((a) => a.status === "completed")
      .map((a) => [a.achievementId, a.completedAt ?? new Date().toISOString()]),
  );

  return {
    async getUserAchievements(_userId) {
      return Array.from(earned.entries()).map(([achievementId, earnedAt]) => ({
        achievementId,
        earnedAt,
      })) satisfies UserAchievement[];
    },

    async unlock(_userId, achievementId) {
      if (!earned.has(achievementId)) {
        earned.set(achievementId, new Date().toISOString());
      }
    },
  };
}
