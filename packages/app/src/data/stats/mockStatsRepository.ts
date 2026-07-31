import type { DailyXp, StatsRepository } from "../types";
import type { DemoReviewEvent } from "../progressStore.mock";

const RATING_XP = { again: 0, hard: 5, good: 10, easy: 15 } as const;

export function createMockStatsRepository(
  reviewEvents: DemoReviewEvent[] = [],
  now: () => Date = () => new Date(),
): StatsRepository {
  return {
    async getWeeklyXp(_userId, _since) {
      const totals = new Map<string, number>();
      reviewEvents.forEach((event) => {
        const date = event.reviewedAt.slice(0, 10);
        totals.set(date, (totals.get(date) ?? 0) + RATING_XP[event.rating]);
      });
      const days: DailyXp[] = [];
      for (let index = 6; index >= 0; index -= 1) {
        const date = new Date(now().getTime() - index * 86_400_000).toISOString().slice(0, 10);
        days.push({ date, xp: totals.get(date) ?? 0 });
      }
      return days;
    },
  };
}
