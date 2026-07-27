import type { Achievement } from "../account/schema";
import type { AchievementRepository, UserAchievement } from "../types";

export interface MutableAchievementState {
  earned: Map<string, string>;
}

export function createMockAchievementState(
  achievements: Achievement[],
  now: () => Date = () => new Date(),
): MutableAchievementState {
  return {
    earned: new Map(
      achievements
        .filter((item) => item.status === "completed")
        .map((item) => [item.achievementId, item.completedAt ?? now().toISOString()]),
    ),
  };
}

export function createMockAchievementRepository(
  achievements: Achievement[],
  now: () => Date = () => new Date(),
  state: MutableAchievementState = createMockAchievementState(achievements, now),
): AchievementRepository {
  return {
    async getUserAchievements(_userId) {
      return Array.from(state.earned.entries()).map(([achievementId, earnedAt]) => ({
        achievementId,
        earnedAt,
      })) satisfies UserAchievement[];
    },
  };
}
