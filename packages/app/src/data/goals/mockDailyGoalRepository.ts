import type { DailyGoal } from "../account/schema";
import type { DailyGoalRecord, DailyGoalRepository } from "../types";

export interface MutableDailyGoalState {
  progress: Map<string, number>;
}

export function createMockDailyGoalState(goals: DailyGoal[]): MutableDailyGoalState {
  return { progress: new Map(goals.map((goal) => [goal.goalId, goal.progress])) };
}

function records(goals: DailyGoal[], state: MutableDailyGoalState, date: string): DailyGoalRecord[] {
  return goals.map((goal) => ({ goalType: goal.goalId, target: goal.target, current: state.progress.get(goal.goalId) ?? goal.progress, goalDate: date }));
}

export function applyMockSessionGoals(
  goals: DailyGoal[], state: MutableDailyGoalState,
  metrics: { cardsReviewed: number; xpEarned: number; sessionsCompleted: number; streakCount: number }, date: string,
): DailyGoalRecord[] {
  for (const goal of goals) {
    const increment = /lesson/i.test(goal.title) ? metrics.sessionsCompleted
      : /\bxp\b/i.test(goal.title) ? metrics.xpEarned
        : /review/i.test(goal.title) ? metrics.cardsReviewed
          : /streak/i.test(goal.title) ? metrics.streakCount : 0;
    if (increment > 0) state.progress.set(goal.goalId, Math.min(goal.target, (state.progress.get(goal.goalId) ?? 0) + increment));
  }
  return records(goals, state, date);
}

export function createMockDailyGoalRepository(
  goals: DailyGoal[],
  now: () => Date = () => new Date(),
  state: MutableDailyGoalState = createMockDailyGoalState(goals),
): DailyGoalRepository {
  const today = now().toISOString().slice(0, 10);
  return {
    async getTodayGoals(_userId) {
      return records(goals, state, today);
    },
  };
}
