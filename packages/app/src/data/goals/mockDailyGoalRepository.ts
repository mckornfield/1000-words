import type { DailyGoal } from "../account/schema";
import type { DailyGoalRecord, DailyGoalRepository } from "../types";

export function createMockDailyGoalRepository(goals: DailyGoal[]): DailyGoalRepository {
  const today = new Date().toISOString().slice(0, 10);
  const progress = new Map(goals.map((g) => [g.goalId, g.progress]));

  return {
    async getTodayGoals(_userId) {
      return goals.map((g) => ({
        goalType: g.goalId,
        target: g.target,
        current: progress.get(g.goalId) ?? g.progress,
        goalDate: today,
      })) satisfies DailyGoalRecord[];
    },

    async incrementGoal(_userId, goalType, by) {
      progress.set(goalType, (progress.get(goalType) ?? 0) + by);
    },
  };
}
